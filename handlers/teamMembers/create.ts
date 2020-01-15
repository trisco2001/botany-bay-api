import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse, GatewayEventInteractor } from "blizzy-core";

import { v4 as uuid } from "uuid";
import dynamodb from '../dynamodb';

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
    const webSocketUrl = process.env.IS_OFFLINE ? `ws://localhost:3001?raidTeamId=${raidTeamId}` : `${process.env.WEB_SOCKET_ENDPOINT_WS}?raidTeamId=${raidTeamId}`

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
            ':updatedAt': timestamp
        },
        ReturnValues: 'UPDATED_NEW',
    };

    dynamodb.update(params, function(err: any, data: any) {
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
            const customData = {id, webSocketUrl};
            console.log(customData)
            const response = {
                statusCode: 200,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify(customData),
            };
            callback(null, response)
        }
    })
  }

export default raidTeamCreate