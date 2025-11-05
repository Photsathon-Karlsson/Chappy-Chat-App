// display & remove users

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Set the DynamoDB table name for users
const USERS_TABLE = process.env.USERS_TABLE || "ChappyUsers";

// Create a new DynamoDB client
const client = new DynamoDBClient({});
// Create a DocumentClient that can talk to the database easily
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
  // Create a scan command to read every item in the table
  const command = new ScanCommand({
    TableName: USERS_TABLE,
  });

  // Send the command to DynamoDB & wait for the result
  const result = await docClient.send(command);

  // Return all user items found, or an empty array if none
  return (result.Items || []) as UserItem[];
}

// Delete one user by userId
export async function deleteUserById(userId: string) {
  // Create a delete command to remove the user from the table
  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { userId }, // Identify which user to delete
  });

  await docClient.send(command);
}
