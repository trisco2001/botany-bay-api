# Serverless DynamoDB Starter

A TypeScript-based DynamoDB Serverless project, made to explore building an API from a Raspberry Pi.

## Setup

Clone the repository, then run the following commands:

```
npm install
serverless dynamodb install
```

If working on a Raspberry Pi, you'll have to install the ARM version of the SQLite4Java lib found in the pi-support folder. Run this command:

```
cp pi-support/libsqlite4java-linux-arm.so .dynamodb/DynamoDBLocal_lib/.
```

# Start the server
```
serverless offline start
```

# Test the server
```
curl -XPOST -d '{ "id": "A", "name": "Tristan" }' 'http://localhost:3000/users'
curl -XGET 'http://localhost:3000/users'
```