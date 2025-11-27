// Extra helper for listing & deleting users

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Set the DynamoDB table name for users
const USERS_TABLE = process.env.USERS_TABLE || "ChappyUsers";

// Read config for DynamoDB
const REGION = process.env.AWS_REGION || "eu-north-1";
// Optional endpoint for local DynamoDB (for example: http://localhost:8000)
const DYNAMO_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

// Create a DynamoDB client with simple credentials
const client = new DynamoDBClient({
  region: REGION,
  endpoint: DYNAMO_ENDPOINT,
  credentials: {
    // Use real keys from env if set, otherwise use simple dev values
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dev-access-key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dev-secret-key",
  },
});

// Create a DocumentClient that can talk to the database easily
const docClient = DynamoDBDocumentClient.from(client);

// Basic user item shape
export type UserItem = {
  userId: string; // Unique ID for each user
  username: string; // The user name
  passwordHash?: string; // Encrypted password
  accessLevel?: string; // Admin or user role
};

// Function to list all users from DynamoDB
export async function listAllUsers() {
  const command = new ScanCommand({
    TableName: USERS_TABLE,
  });

  const result = await docClient.send(command);

  // Return all user items found, or an empty array if none
  return (result.Items || []) as UserItem[];
}

// Delete one user by userId
export async function deleteUserById(userId: string) {
  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { userId }, // Identify which user to delete
  });

  await docClient.send(command);
}