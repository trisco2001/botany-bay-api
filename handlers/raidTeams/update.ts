import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse, GatewayEventInteractor } from "blizzy-core";

import dynamodb from '../dynamodb';

const updateRaidTeam: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    if (typeof event.body !== 'string') {
        callback("No body", BasicResponses.badRequest("Invalid user characters body for update."))
        return
    }

    const data = JSON.parse(event.body)
    const timestamp = new Date().getTime();
    const gatewayEventInteractor = new GatewayEventInteractor(event)

    const id = gatewayEventInteractor.path("raidTeamId")

    const params = createUpdateParams(id, data, timestamp);

    dynamodb.update(params, function (err: any, data: any) {
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
                body: JSON.stringify(data),
            };
            callback(null, response)
        }
    })
}

export default updateRaidTeam

function createUpdateParams(id: string, data: {name: string, server: string}, timestamp: number) {
    return {
        TableName: process.env.TABLE_RAID_TEAMS,
        Key: {
            id: id,
        },
        ExpressionAttributeNames: {
            '#server': 'server',
            '#name': 'name',
            '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
            ':server': data.server,
            ':name': data.name,
            ':updatedAt': timestamp,
        },
        UpdateExpression: 'SET #name = :name, #server = :server, #updatedAt = :updatedAt',
        ReturnValues: 'ALL_NEW',
    };
}
