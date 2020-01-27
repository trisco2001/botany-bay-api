import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda"
import { BasicResponses, BasicResponse, GatewayEventInteractor } from "blizzy-core";

import dynamodb from '../dynamodb';

const handler: Handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) => {
    const tableName = process.env.TABLE_CHARACTER_METRICS;
        let params = {
            TableName: process.env.TABLE_CHARACTER_METRICS_OLD
        }
        dynamodb.scan(params, function(err: any, data: any) {
            const items = data.Items;

            const updates = items.map(item => {
                const params = {
                    TableName: process.env.TABLE_CHARACTER_METRICS,
                    Item: item,
                    ReturnValues: 'ALL_OLD',
                };
                return dynamodb.put(params).promise()
            });
            return updates.reduce((promiseChain, currentTask) => {
                return promiseChain.then(chainResults =>
                    currentTask.then(currentResult =>
                        [ ...chainResults, currentResult ]
                    )
                );
            }, Promise.resolve([])).then(arrayOfResults => {
                // Do something with all results
            });
        })
}
  
exports.handler = handler;