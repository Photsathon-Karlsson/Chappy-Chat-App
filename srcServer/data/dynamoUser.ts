// Helpers for DynamoDB tables used in Chappy

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// DynamoDB client & document client
const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

// Table names
export const USER_TABLE =
  process.env.USER_TABLE || process.env.USERS_TABLE || "ChappyUsers";
export const USERS_TABLE = USER_TABLE;

// Channels table (used by channels routes)
export const CHANNEL_TABLE =
  process.env.CHANNEL_TABLE || "ChappyChannels";

// DMs table (used by dms routes, if needed)
export const DM_TABLE = process.env.DM_TABLE || "ChappyDMs";

// Messages table (used by messages routes, if needed)
export const MESSAGE_TABLE =
  process.env.MESSAGE_TABLE || "ChappyMessages";

// Basic user record shape
export type UserItem = {
  userId: string;
  username: string;
  passwordHash?: string;
  accessLevel?: string;
};

// dbUser is the document client used by old code (login, register, channels, etc.)
export const dbUser = docClient;

// List all users from DynamoDB
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

// Re-export commands if some routes want to use them directly
export {
  PutCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
};
