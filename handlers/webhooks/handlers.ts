import dynamodb from './dynamodb';

const AWS = require('aws-sdk');

exports.connect = function(event, context, callback) {
    console.log(`** web socket connected! ${event.requestContext.connectionId}`);
    console.log(JSON.stringify(event));
    var putParams = {
        TableName: process.env.TABLE_WEB_HOOKS,
        Item: {
            raidTeamId: event.queryStringParameters.raidTeamId,
            connectionId: event.requestContext.connectionId
        }
    };

    try {
        dynamodb.put(putParams, function(err, data) {
            callback(null, {
            statusCode: err ? 500 : 200,
            body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected"
            });
        });
    } catch (error) {
        console.log(error)
    }
};

exports.disconnect = function(event, context, callback) {
    console.log(`** web socket disconnected...${event.requestContext.connectionId}`);
    console.log(JSON.stringify(event));
    var deleteParams = {
        TableName: process.env.TABLE_WEB_HOOKS,
        Key: {
            connectionId: event.requestContext.connectionId
        }
    };

    try {
        dynamodb.delete(deleteParams, function(err, data) {
            callback(null, {
            statusCode: err ? 500 : 200,
            body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected"
            });
        });
    } catch (error) {
        console.log(error)
    }
};