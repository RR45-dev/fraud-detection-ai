const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "FlaggedTransactions";

const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const docClient = DynamoDBDocumentClient.from(client);

async function ensureTable() {
  const { TableNames } = await client.send(new ListTablesCommand({}));
  if (TableNames.includes(TABLE_NAME)) return;
  await client.send(new CreateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [{ AttributeName: "transactionId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "transactionId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  }));
  console.log(`Created DynamoDB table ${TABLE_NAME}`);
}

async function saveTransaction(record) {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));
}

async function listTransactions() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (Items || []).sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = { ensureTable, saveTransaction, listTransactions };
