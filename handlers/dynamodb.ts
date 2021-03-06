'use strict';

const AWS = require('aws-sdk');

let options = {};

// connect to local DB if running offline
if (process.env.IS_OFFLINE) {
  AWS.config = new AWS.Config();
  AWS.config.accessKeyId = "xxxxxxxxxxxxxx";
  AWS.config.secretAccessKey = "xxxxxxxxxx";
  AWS.config.region = "region";
  options = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
  };
}

const client = new AWS.DynamoDB.DocumentClient(options);

export default client;
