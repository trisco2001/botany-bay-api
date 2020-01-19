import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponse, GatewayEventInteractor } from "blizzy-core";
import dynamodb from '../dynamodb';

const raidTeamsList: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    const gatewayEventInteractor = new GatewayEventInteractor(event);
    console.log(JSON.stringify(event));
    const friendlyId = gatewayEventInteractor.queryString('friendlyId');
    if (friendlyId) {
        let params = {
            TableName: process.env.TABLE_RAID_TEAMS,
            IndexName: 'gsi_friendly_id',
            ExpressionAttributeNames: {
                '#friendlyId': 'friendlyId',
            },
            ExpressionAttributeValues: {
                ':friendlyId': friendlyId
            },
            KeyConditionExpression: "#friendlyId = :friendlyId"
        };
        console.log(params);
        dynamodb.query(params, function (err: any, data: any) {
            if (err) {
                console.log(`Error Result of looking up raid teams by friendly id: ${JSON.stringify(err)}`);
            }
            if (data.Items.length === 0) {
                console.log(`No teams by friendly id ${friendlyId}`);
            }

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
            else if (data.Items.length === 0) {
                console.log(`No teams by friendly id ${friendlyId}`);
                const response: BasicResponse = {
                    statusCode: 404,
                    headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    },
                    body: JSON.stringify({message: `No teams by friendly id ${friendlyId}`}),
                };
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
    } else {
        const tableName = process.env.TABLE_RAID_TEAMS
        let params = {
            TableName: tableName,
            Limit: 10,
        }
        dynamodb.scan(params, function(err: any, data: any) {
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
    
  }

export default raidTeamsList