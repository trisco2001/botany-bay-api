import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse } from "blizzy-core";

import { v4 as uuid } from "uuid";
import dynamodb from './dynamodb';

const raidTeamCreate: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    if (typeof event.body !== 'string') {
        callback("No body", BasicResponses.badRequest("The server and name were expected components of this request."))
        return
    }

    const data = JSON.parse(event.body)
    const timestamp = new Date().getTime();
    const id = uuid();

    const params = {
        TableName: process.env.TABLE_RAID_TEAMS,
        Item: {
            id: id,
            server: data.server,
            name: data.name,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        ReturnValues: 'ALL_OLD',
    };

    dynamodb.put(params, function(err: any, data: any) {
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