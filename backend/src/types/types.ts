import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Routes
export interface MyAuthJwtPayload extends jwt.JwtPayload {
  userId: string
}

// Databases
type ObjectId = mongoose.Types.ObjectId;
// NOTE: there used to be a `type Date = mongoose.Schema.Types.Date` alias
// here, shadowing the global `Date` for this entire file. Schema.Types.Date
// is the token you use when *declaring* a schema field, not the type of a
// hydrated document's value, so every `: Date` below was silently pointing
// at the wrong thing. Removed - `Date` now means the real thing.

export interface UserInput {
  username: string;
  password: string;
  age: number;
  email: string;
}

export interface CardInput {
  createdBy: ObjectId;
  tags?: ObjectId[];
  description?: string;
  note?: string;
  title: string;
  editHistory?: {
    // Optional: matches the schema (Card.ts doesn't mark this required
    // either), and lets an anonymous edit-via-share-link record an entry
    // with no known user, instead of that entry failing validation or a
    // fake ObjectId having to be invented for it.
    userId?: ObjectId,
    userName: string,
    timeStamp?: Date;
  }[];
  // 384-dim vector from embedText() (services/embeddingModel.ts). Optional
  // because older cards won't have one until the backfill script runs.
  embedding?: number[];
} 

export type ShareTargetType = 'card' | 'brain';
export type SharePermission = 'view' | 'edit';

export interface LinkInput {
  createdBy: ObjectId;
  token: string;
  // null = never expires; a real Date is the exact TTL deletion instant.
  expiresAt: Date | null;
  clickCount: number;
  revoked: boolean;
  targetedAt?: ObjectId; 
  targetType: ShareTargetType;
  permission: SharePermission;
}
