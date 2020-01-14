import { Handler, Context, Callback, DynamoDBStreamEvent } from "aws-lambda"
import { CharacterService, BlizzyService } from "blizzy-core";

import { RequesterService } from "blizzy-core/dist/services/requesterService";
import { Environment } from "../../environment";
import dynamodb from './dynamodb';
const AWS = require('aws-sdk');

class BotanyBayRaidTeamService {
    saveCharacterInfoToTeamMember(raidTeamId: string, raidTeamMemberId: string, insertedCharacter: any) {
        console.log(`${raidTeamId} <= ${raidTeamMemberId}`);
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
            else {
                console.log(`Successfully set character data for ${raidTeamMemberId}`)
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

function signalExtendedInfoWithWebhook(raidTeamId: string, teamMemberId: string, server: string, name: string, characterData: any) {
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
	    endpoint: 'http://localhost:3001'
    });
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
        const matchingItems = data.Items.filter(item => item.raidTeamId == raidTeamId);
        const promises = matchingItems.map(item => {
            const connectionId = item.connectionId;
            console.log(`** signalling web socket ${connectionId}`);
            return apigwManagementApi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify({raidTeamId, id: teamMemberId, server, name, characterData})
            }).promise();
        });
        Promise.all(promises).then(results => {
            console.log("signalled websockets")
        })
    })
}

const lookupCharacterStreamHandler: Handler = (event: DynamoDBStreamEvent, context: Context, callback: Callback) => {

    event.Records.forEach(async record => {
        // Look for an existing record in the character info page
        const image = record.dynamodb.NewImage;
        if (!image) {
            return;
        }

        const id = image.id.S;
        const server = image.server.S;
        const name = image.name.S;
        const raidTeamId = image.raidTeamId.S;

        console.log(`Adding ${name} from ${server} to raid team ID ${raidTeamId}`);

        if (!server || !name || !raidTeamId) {
            return;
        }
        
        if (record.eventName === "INSERT") {
            
            const blizzardCharacterResponse = await blizzardCharacterService.getCharacterInfo(name, server);
            if (blizzardCharacterResponse.statusCode == 404) {
                console.log(`character ${name}-${server} not found on blizzard`);
                return;
            }
            else if (blizzardCharacterResponse.statusCode == 200) {
                console.log(`character ${name}-${server} found! saving character`);
                const characterObject = JSON.parse(blizzardCharacterResponse.body);
                botanyBayRaidTeamService.saveCharacterInfoToTeamMember(raidTeamId, id, characterObject);
                signalExtendedInfoWithWebhook(raidTeamId, id, server, name, characterObject);
            }
        } else if (record.eventName == "REMOVE") {
            botanyBayRaidTeamService.removeCharacterFromRaidTeam(raidTeamId, server, name);
        }
    });
    callback(null, {});
}

export default lookupCharacterStreamHandler