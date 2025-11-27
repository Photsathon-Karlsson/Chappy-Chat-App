// Register a new user in DynamoDB (username + password).
// Steps: validate/check body -> hash password -> save to Dynamo -> return success.

import express, { type Router, type Request, type Response } from "express";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { genSalt, hash } from "bcryptjs"; // use bcryptjs (Windows-friendly)
import crypto from "node:crypto";
import { z } from "zod";

// Dynamo connection + table 
import { dbUser, USER_TABLE } from "../data/dynamoUser.js";

const router: Router = express.Router();

// Types (for response shape) 
type RegisterResponse = {
  success: boolean;
  userId?: string;
  message?: string;
};

// Zod schema (validate request body)
// username >= 3 chars, password >= 4 chars
const RegisterBody = z.object({
  username: z.string().min(3, "username must be at least 3 chars"),
  password: z.string().min(4, "password must be at least 4 chars"),
});

// POST /api/register
router.post(
  "/",
  async (
    // Use Record<string, never> so TypeScript doesn't complain about {}
    req: Request<Record<string, never>, RegisterResponse, z.infer<typeof RegisterBody>>,
    res: Response<RegisterResponse>
  ) => {
    // Validate body (Check if the body is valid)
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      // get the first error message
      const msg = parsed.error.issues[0]?.message ?? "invalid body";
      return res.status(400).json({ success: false, message: msg });
    }

    const { username, password } = parsed.data;

    // Create a unique id for the new user
    // crypto.randomUUID() = unique string id
    const newId = crypto.randomUUID();

    // Hash the password (so don’t store it as plain text)
    const salt: string = await genSalt();
    const hashed: string = await hash(password, salt);

    // Prepare DynamoDB put command
    // IMPORTANT: Your table uses UPPERCASE keys => PK / SK
    const putCmd = new PutCommand({
      TableName: USER_TABLE,
      Item: {
        PK: "USER",            // Partition key 
        SK: `USER#${newId}`,   // Sort key 
        username: username,
        password: hashed,      // store the hashed password only
        accessLevel: "user",
        createdAt: new Date().toISOString(),
      },
      // make sure taht don’t replace a user that is already in the database
      ConditionExpression: "attribute_not_exists(SK)",
    });

    try {
      // Save the user in DynamoDB
      await dbUser.send(putCmd);

      // Send a success response
      return res.status(201).json({ success: true, userId: newId });
    } catch (err: unknown) {
      // handle DynamoDB errors safely
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}` : "unknown error";
      console.error("[register] Dynamo error:", msg);
      return res.status(500).json({ success: false, message: "register failed" });
    }
  }
);

export default router;