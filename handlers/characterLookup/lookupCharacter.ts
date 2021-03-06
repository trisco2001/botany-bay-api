import { Handler, Context, Callback, DynamoDBStreamEvent } from "aws-lambda"
import { ApiGatewayManagementApi } from "aws-sdk";
import { CharacterService, BlizzyService } from "blizzy-core";

import { RequesterService } from "blizzy-core/dist/services/requesterService";
import { Environment } from "../../environment";

import dynamodb from '../dynamodb';
import { isNullOrUndefined } from "util";

class CharacterMetricService {
    saveCharacterMetric(raidTeamMemberId: string, calculatedItemLevel: number) {
        console.log(`Saving character metric: ${raidTeamMemberId} - ${calculatedItemLevel}`);
        const timestamp = new Date().getTime();
        const params = {
            TableName: process.env.TABLE_CHARACTER_METRICS,
            Item: {
                raidTeamMemberId: raidTeamMemberId,
                timestamp: timestamp,
                averageItemLevel: calculatedItemLevel
            },
            ReturnValues: 'ALL_OLD',
        };
    
        dynamodb.put(params, function (err: any, data: any) {
            if (err) {
                console.log(`Failed to set character data for ${raidTeamMemberId}: ${err}`)
            }
        })
    }
}

class TeamMemberItemLevelUtility {
    static calculateItemLevel(characterInfo) {
        if (!characterInfo || !characterInfo.items) {
            return 0;
        }
        
        const items = characterInfo.items;
        const slots = ['back', 'chest', 'feet', 'finger1', 'finger2', 'hands', 'head', 'legs', 'mainHand', 'offHand', 'neck', 'shoulder', 'trinket1', 'trinket2', 'waist', 'wrist'];
        const equippedSlots = slots.filter(slot => !isNullOrUndefined(items[slot]));
        const equippedItemLevels = equippedSlots.map(slot => items[slot].itemLevel);
        if (equippedItemLevels.length == 0) {
            return 0;
        }
        const totalItemLevel = equippedItemLevels.reduce((a, b) => a + b);
        const averageItemLevel = totalItemLevel / equippedSlots.length;
        console.log(`averageItemLevel: ${averageItemLevel} over ${equippedItemLevels.length} equipped items`);
        return averageItemLevel;
    }
}

class BotanyBayRaidTeamService {
    saveCharacterInfoToTeamMember(raidTeamId: string, raidTeamMemberId: string, insertedCharacter: any) {
        const timestamp = new Date().getTime();
        const removeEmpty = obj => {
            const newObj = {};
          
            Object.keys(obj).forEach(key => {
              if (obj[key] && typeof obj[key] === "object") {
                newObj[key] = removeEmpty(obj[key]); // recurse
              } else if (obj[key]) {
                newObj[key] = obj[key]; // copy value
              }
            });
          
            return newObj;
          };
        const cleansedCharacter = removeEmpty(insertedCharacter);
        const params = {
            TableName: process.env.TABLE_RAID_TEAM_MEMBERS,
            Key: {
                raidTeamId: raidTeamId,
                id: raidTeamMemberId,
            },
            ExpressionAttributeNames: {
                '#updatedAt': 'updatedAt',
                '#characterData': 'characterData'
            },
            ExpressionAttributeValues: {
                ':updatedAt': timestamp,
                ':characterData': cleansedCharacter
            },
            UpdateExpression: 'SET #characterData = :characterData, #updatedAt = :updatedAt',
            ReturnValues: 'ALL_NEW',
        };
    
        dynamodb.update(params, function (err: any, data: any) {
            if (err) {
                console.log(`Failed to set character data for ${raidTeamMemberId}: ${err}`)
            }
        })
    }
    
    removeCharacterFromRaidTeam(raidTeamId: string, server: string, name: string) {
        console.log("Not really removing character");
    }
}

const environment = new Environment();
const requesterService = new RequesterService(environment, "USp0m1RVU3OYiPwlsElija8vxwxS5v4d7r");
const blizzyService = new BlizzyService(requesterService);
const blizzardCharacterService = new CharacterService(blizzyService);
const botanyBayRaidTeamService = new BotanyBayRaidTeamService();
const characterMetricService = new CharacterMetricService();

function signalExtendedInfoWithWebhook(raidTeamId: string, teamMemberId: string, server: string, name: string, characterData: any) {
    
    const params = {
        TableName: process.env.TABLE_WEB_HOOKS,
        IndexName: 'gsi_raid_team_id',
        ExpressionAttributeNames: {
            '#raidTeamId': 'raidTeamId',
        },
        ExpressionAttributeValues: {
            ':raidTeamId': raidTeamId
        },
        KeyConditionExpression: "#raidTeamId = :raidTeamId"
    };
    dynamodb.query(params, function (err: any, data: any) {
        if (err) {
            console.log(`Error Result of looking up connections for raid team: ${JSON.stringify(err)}`)
        }
        const matchingItems = data.Items.filter(item => item.raidTeamId == raidTeamId);
        const promises = matchingItems.map(item => {
            const connectionId = item.connectionId;
            const apigwManagementApi = new ApiGatewayManagementApi({
                apiVersion: '2018-11-29',
                region: 'us-west-2',
                endpoint: process.env.IS_OFFLINE ? `http://localhost:3001` : `${process.env.WEB_SOCKET_ENDPOINT_HTTP}`
            });
            return apigwManagementApi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify({raidTeamId, id: teamMemberId, server, name, characterData})
            }).promise();
        });
        Promise.all(promises)
        .then(results => {
        })
        .catch(error => {
            console.log(`error signalling websockets: ${error}`);
        });
    })
}

const lookupCharacterStreamHandler: Handler = (event: DynamoDBStreamEvent, context: Context, callback: Callback) => {
    event.Records.forEach(async record => {
        // Look for an existing record in the character info page
        const image = record.dynamodb.NewImage;
        if (!image) {
            return;
        }

        if (!(image.id && image.server && image.name && image.raidTeamId)) {
            console.log("incomplete record detected, skipping");
            return;
        }
        const id = image.id.S;
        const server = image.server.S;
        const name = image.name.S;
        const raidTeamId = image.raidTeamId.S;

        if (!server || !name || !raidTeamId) {
            return;
        }
        
        if (record.eventName === "INSERT") {
            
            const blizzardCharacterResponse = await blizzardCharacterService.getCharacterInfo(name, server);
            if (blizzardCharacterResponse.statusCode == 404) {
                return;
            }
            else if (blizzardCharacterResponse.statusCode == 200) {
                const characterObject = JSON.parse(blizzardCharacterResponse.body);
                botanyBayRaidTeamService.saveCharacterInfoToTeamMember(raidTeamId, id, characterObject);
                const calculatedItemLevel = TeamMemberItemLevelUtility.calculateItemLevel(characterObject);
                characterMetricService.saveCharacterMetric(id, calculatedItemLevel);
                try {
                    signalExtendedInfoWithWebhook(raidTeamId, id, server, name, characterObject);
                } catch (error) {
                    console.log("error occurred signaling webhook info")
                    console.log(error);
                }
            }
        } else if (record.eventName == "REMOVE") {
            botanyBayRaidTeamService.removeCharacterFromRaidTeam(raidTeamId, server, name);
        }
    });
    callback(null, {});
}

export default lookupCharacterStreamHandler