import { Handler } from "aws-lambda"
import { ApiGatewayManagementApi } from "aws-sdk";
import { CharacterService, BlizzyService } from "blizzy-core";

import { RequesterService } from "blizzy-core/dist/services/requesterService";
import { Environment } from "../../environment";

import dynamodb from '../dynamodb';
import { isNullOrUndefined } from "util";
import { _ } from "underscore";

class CharacterMetricService {
    saveCharacterMetric(raidTeamMemberId: string, raidTeamId: string, calculatedItemLevel: number) {
        console.log(`Saving character metric: ${raidTeamMemberId} - ${calculatedItemLevel}`);
        const timestamp = new Date().getTime();
        const params = {
            TableName: process.env.TABLE_CHARACTER_METRICS,
            Item: {
                raidTeamMemberId: raidTeamMemberId,
                raidTeamId: raidTeamId,
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

class BotanyBayRaidTeamService {
    removeEmpty(obj) {
        const newObj = {};
        
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === "object") {
                newObj[key] = this.removeEmpty(obj[key]); // recurse
            } else if (obj[key]) {
                newObj[key] = obj[key]; // copy value
            }
        });
        
        return newObj;
    };

    itemsAreEquivalent(characterInfoA, characterInfoB) {
        if (isNullOrUndefined(characterInfoA) || isNullOrUndefined(characterInfoB)) {
            console.log(`CA: ${characterInfoA}, CB: ${characterInfoB}`);
            return false;
        }

        const itemsA = characterInfoA.items;
        const itemsB = characterInfoB.items;
        if (isNullOrUndefined(itemsA) || isNullOrUndefined(itemsB)) {
            console.log(`IA: ${itemsA}, IB: ${itemsB}`);
            return false;
        }

        const cleansedA = this.removeEmpty(itemsA);
        const cleansedB = this.removeEmpty(itemsB);

        const stringifiedA = JSON.stringify(cleansedA);
        const stringifiedB = JSON.stringify(cleansedB);

        return stringifiedA === stringifiedB;
    }

    async loadAllTeamMembers() {
        const params = {
            TableName: process.env.TABLE_RAID_TEAM_MEMBERS
        };
        
        try {
            const result = await dynamodb.scan(params).promise();
            return result.Items;
        } catch (error) {
            console.log("error scanning raid team members");
            console.log(error);
        }
    }
    saveCharacterInfoToTeamMember(raidTeamId: string, raidTeamMemberId: string, insertedCharacter: any) {
        const timestamp = new Date().getTime();
        
        const cleansedCharacter = this.removeEmpty(insertedCharacter);
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

const environment = new Environment();
const requesterService = new RequesterService(environment, "USp0m1RVU3OYiPwlsElija8vxwxS5v4d7r");
const blizzyService = new BlizzyService(requesterService);
const blizzardCharacterService = new CharacterService(blizzyService);
const botanyBayRaidTeamService = new BotanyBayRaidTeamService();
const characterMetricService = new CharacterMetricService();

async function processTeamMember(teamMember) {
    const characterInfoResponse = await blizzardCharacterService.getCharacterInfo(teamMember.name, teamMember.server);
    if (characterInfoResponse.statusCode != 200) {
        return;
    }

    const newCharacterInfo = JSON.parse(characterInfoResponse.body);
    if (!teamMember.characterData) {
        console.log(`No character info saved. Updating character...`);
        await botanyBayRaidTeamService.saveCharacterInfoToTeamMember(teamMember.raidTeamId, teamMember.id, newCharacterInfo)
        const calculatedItemLevel = TeamMemberItemLevelUtility.calculateItemLevel(teamMember.characterData);
        await characterMetricService.saveCharacterMetric(teamMember.id, teamMember.raidTeamId, calculatedItemLevel)
    } else {
        if (!_.isEqual(botanyBayRaidTeamService.removeEmpty(teamMember.characterData), botanyBayRaidTeamService.removeEmpty(newCharacterInfo))) {
            console.log(`New items don't equal old items; updating character`);
            await botanyBayRaidTeamService.saveCharacterInfoToTeamMember(teamMember.raidTeamId, teamMember.id, newCharacterInfo)
            const calculatedItemLevel = TeamMemberItemLevelUtility.calculateItemLevel(teamMember.characterData);
            await characterMetricService.saveCharacterMetric(teamMember.id, teamMember.raidTeamId, calculatedItemLevel)
        } else {
            console.log(`New items too close to old items; skipping character update`);
        }
    }
}

export const handler: Handler = async (event, context, callback) => {
    // Load all the characters
    const teamMembers = await botanyBayRaidTeamService.loadAllTeamMembers();
    if (!teamMembers) {
        callback(null, {});
    }

    for (const teamMember of teamMembers) {
        try {
            await processTeamMember(teamMember);
        } catch (error) {
            console.log(`Error processing team member: ${teamMember.name}`);
            console.log(`${error}`);
        }
    }

    callback(null, {});
}