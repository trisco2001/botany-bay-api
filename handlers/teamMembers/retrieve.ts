import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse, GatewayEventInteractor } from "blizzy-core";

import dynamodb from '../dynamodb';

const retrieveRaidTeam: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    const gatewayEventInteractor = new GatewayEventInteractor(event)
    
    const raidTeamId = gatewayEventInteractor.path("raidTeamId")
    const id = gatewayEventInteractor.path("id")

    const params = {
        TableName: process.env.TABLE_RAID_TEAM_MEMBERS,
        ExpressionAttributeNames: {
            '#raidTeamId': 'raidTeamId',
            '#id': 'id',
        },
        ExpressionAttributeValues: {
            ':id': id,
            ':raidTeamId': raidTeamId
        },
        KeyConditionExpression: "#raidTeamId = :raidTeamId AND #id = :id"
    };
    dynamodb.query(params, function (err: any, data: any) {
        if (err) {
            console.log(err)
            const response: BasicResponse = {
                statusCode: 500,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify(err),
            }
            callback(err, response)
        }
        else {
            const response = {
                statusCode: 200,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify(data.Items[0]),
            };
            callback(null, response)
        }
    })
}

export default retrieveRaidTeam