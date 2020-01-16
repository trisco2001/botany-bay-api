import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponse, GatewayEventInteractor } from "blizzy-core";

import dynamodb from '../dynamodb';

const deleteRaidTeam: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    const gatewayEventInteractor = new GatewayEventInteractor(event)

    const raidTeamId = gatewayEventInteractor.path("raidTeamId")
    const id = gatewayEventInteractor.path("id")

    const params = {
        TableName: process.env.TABLE_RAID_TEAM_MEMBERS,
        Key: {
            raidTeamId: raidTeamId,
            id: id,
        }
    };

    dynamodb.delete(params, function (err: any, data: any) {
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

export default deleteRaidTeam