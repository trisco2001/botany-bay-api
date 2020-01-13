import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse, GatewayEventInteractor } from "blizzy-core";

import { v4 as uuid } from "uuid";
import dynamodb from './dynamodb';

const raidTeamCreate: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    if (typeof event.body !== 'string') {
        callback("No body", BasicResponses.badRequest("The server and name were expected components of this request."))
        return
    }

    const gatewayEventInteractor = new GatewayEventInteractor(event)
    const data = JSON.parse(event.body)
    const timestamp = new Date().getTime();
    const name = data.name;
    const server = data.server;
    const raidTeamId = gatewayEventInteractor.path("raidTeamId")
    const id = `${raidTeamId}-${server}-${name}`;

    const params = {
        TableName: process.env.TABLE_RAID_TEAM_MEMBERS,
        Key: {
            raidTeamId: raidTeamId,
            id: id
        },
        UpdateExpression: "SET #server = :server, #name = :name, #createdAt = :createdAt, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
            '#server': 'server',
            '#name': 'name',
            '#createdAt': 'createdAt',
            '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
            ':server': data.server,
            ':name': data.name,
            ':createdAt': timestamp,
            ':updatedAt': timestamp,
        },
        ReturnValues: 'UPDATED_NEW',
    };

    dynamodb.update(params, function(err: any, data: any) {
        if (err) {
            console.log(err)
            const response: BasicResponse = {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(err),
            }
            callback(err, response)
        }
        else {
            const customData = {id};
            console.log(customData)
            const response = {
                statusCode: 200,
                body: JSON.stringify(customData),
            };
            callback(null, response)
        }
    })
  }

export default raidTeamCreate