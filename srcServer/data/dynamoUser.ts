// Helpers for DynamoDB tables used in Chappy

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// DynamoDB config (region + optional local endpoint for local DynamoDB)
const REGION = process.env.AWS_REGION || "eu-north-1";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

// Build client config for DynamoDB client
const clientConfig: Record<string, unknown> = {
  region: REGION,
};

if (DYNAMODB_ENDPOINT) {
  // If run local DynamoDB, can set DYNAMODB_ENDPOINT in .env
  clientConfig.endpoint = DYNAMODB_ENDPOINT;
}

// Low level client & document client
const lowLevelClient = new DynamoDBClient(clientConfig);
export const docClient = DynamoDBDocumentClient.from(lowLevelClient);

// Table names (from .env)
export const USER_TABLE =
  process.env.DDB_TABLE_USERS || process.env.USERS_TABLE || "ChappyData";

export const CHANNEL_TABLE =
  process.env.DDB_TABLE_CHANNELS || "ChappyData";

export const MESSAGE_TABLE =
  process.env.DDB_TABLE_MESSAGES || "ChappyMessages";

// Old code uses dbUser.send(...)
export const dbUser = docClient;

// Raw item from DynamoDB (mixed shape, so value is unknown)
export type RawItem = Record<string, unknown>;

// Shape that expect for user rows (extends RawItem)
type DynamoUserRow = RawItem & {
  PK?: string;
  SK?: string;
  username?: string;
  name?: string;
  accessLevel?: string;
};

// Clean user record that API will return
export type UserItem = {
  userId: string;   // simple id we create from PK / SK (no "#" char)
  username: string;
  accessLevel: string;
  pk: string;       // original PK (for delete)
  sk: string;       // original SK (for delete)
};

// Helper: safely convert unknown to string
function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Make a simple userId from PK + SK patterns in your table
function getUserIdFromKeys(pk?: string, sk?: string): string | null {
  if (!pk || !sk) return null;

  // OLD STYLE 1:
  //   PK = "USER#4"
  //   SK = "PROFILE#4"
  // -> userId = "4"
  if (pk.startsWith("USER#") && sk.startsWith("PROFILE#")) {
    return pk.slice("USER#".length);
  }

  // NEW STYLE:
  //   PK = "USER"
  //   SK = "USER#2ce35488-...."
  // -> userId = "2ce35488-...."
  if (pk === "USER" && sk.startsWith("USER#")) {
    return sk.slice("USER#".length);
  }

  // Fallback: use SK or PK as-is (remove "USER#" prefix if possible)
  if (sk.startsWith("USER#")) return sk.slice("USER#".length);
  if (pk.startsWith("USER#")) return pk.slice("USER#".length);

  return sk || pk || null;
}

// Get only user rows from the mixed table
export async function listAllUsers(): Promise<UserItem[]> {
  const command = new ScanCommand({
    TableName: USER_TABLE,
    ProjectionExpression: "#PK, #SK, username, accessLevel",
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
    },
  });

  const result = await docClient.send(command);
  const items = (result.Items ?? []) as RawItem[];

  const users: UserItem[] = [];

  for (const raw of items) {
    const it = raw as DynamoUserRow;

    const pk = getString(it.PK);
    const sk = getString(it.SK);

    // Keep only rows that look like user rows
    const looksLikeUser = pk === "USER" || pk.startsWith("USER#");
    if (!looksLikeUser) continue;

    const username = getString(it.username ?? it.name);
    if (!username) continue;

    const userId = getUserIdFromKeys(pk, sk);
    if (!userId) continue;

    users.push({
      userId,
      username,
      accessLevel: getString(it.accessLevel ?? "user"),
      pk,
      sk,
    });
  }

  return users;
}

// Delete one user row by our simple userId
export async function deleteUserById(userId: string): Promise<void> {
  // First find the row for this userId
  const users = await listAllUsers();
  const row = users.find((u) => u.userId === userId);

  if (!row) {
    // Nothing to delete (id not found)
    return;
  }

  const command = new DeleteCommand({
    TableName: USER_TABLE,
    Key: {
      PK: row.pk,
      SK: row.sk,
    },
  });

  await docClient.send(command);
}