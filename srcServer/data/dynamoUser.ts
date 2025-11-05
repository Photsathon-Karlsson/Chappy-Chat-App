// Connect to AWS DynamoDB for Chappy backend
// Sets up the connection & exports a "user" to talk to DynamoDB

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

// Read AWS credentials from .env file
const accessKey: string = process.env.ACCESS_KEY || "";
const secretKey: string = process.env.SECRET_ACCESS_KEY || "";
const region: string = process.env.AWS_REGION || "eu-north-1";

// Create DynamoDB connection (basic connection to AWS)
const user: DynamoDB = new DynamoDB({
  region: region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

// Create a "Document" version of the connection
// Can use normal JavaScript objects (no need to convert types)
const dbUser = DynamoDBDocument.from(user);

// Table names (read from .env)
export const USER_TABLE = process.env.DDB_TABLE_USERS || "ChappyUsers";
export const CHANNEL_TABLE = process.env.DDB_TABLE_CHANNELS || "ChappyChannels";
export const MESSAGE_TABLE = process.env.DDB_TABLE_MESSAGES || "ChappyMessages";

// Export both versions
export { user, dbUser };
