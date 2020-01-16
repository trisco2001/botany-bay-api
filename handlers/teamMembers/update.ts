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

    const raidTeamId = gatewayEventInteractor.path("raidTeamId")
    const id = gatewayEventInteractor.path("id")

    const params = {
        TableName: process.env.TABLE_RAID_TEAM_MEMBERS,
        Key: {
            raidTeamId: raidTeamId,
            id: id,
        },
        ExpressionAttributeNames: {
            '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
            ':updatedAt': timestamp,
        },
        UpdateExpression: 'SET #updatedAt = :updatedAt',
        ReturnValues: 'ALL_NEW',
    };

    if (data.role) {
        params.ExpressionAttributeNames['#role'] = 'role';
        params.ExpressionAttributeValues[':role'] = data.role;
        params.UpdateExpression = `${params.UpdateExpression}, #role = :role`;
    }

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