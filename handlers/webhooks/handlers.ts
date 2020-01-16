import dynamodb from '../dynamodb';

exports.connect = function(event, context, callback) {
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
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true,
            },
            body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected"
            });
        });
    } catch (error) {
        console.log(error)
    }
};

exports.disconnect = function(event, context, callback) {
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
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true,
            },
            body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected"
            });
        });
    } catch (error) {
        console.log(error)
    }
};

exports.default = function(event, context, callback) {
    callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: "Working"
    });
}