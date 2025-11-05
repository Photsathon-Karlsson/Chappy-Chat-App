// Extra helper for listing & deleting users

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Set the DynamoDB table name for users
const USERS_TABLE = process.env.USERS_TABLE || "ChappyUsers";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Basic user item shape
export type UserItem = {
  userId: string;           // Unique ID for each user
  username: string;         // The user’s name
  passwordHash?: string;    // Encrypted password
  accessLevel?: string;     // Admin or user role
};

// Function to list all users from DynamoDB
export async function listAllUsers() {
  const command = new ScanCommand({
    TableName: USERS_TABLE,
  });
  const result = await docClient.send(command);
  return (result.Items || []) as UserItem[];
}

// Delete one user by userId
export async function deleteUserById(userId: string) {
  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  });
  await docClient.send(command);
}
