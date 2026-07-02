import mongoose from "mongoose";
import crypto from "crypto";
import type { LinkInput } from "../types/types.js";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const LinkSchema = new Schema<LinkInput>({
  expiresAt: { type: Date, expires: '7d', default: Date.now },
  clickCount: { type: Number, default: 0 },
  createdBy: { type: ObjectId, required: true, ref: 'users' },
  token: { 
    type: String, 
    default: () => crypto.randomBytes(16).toString('hex'), 
    required: true, 
    unique: true 
  },
  targetedAt: { type: ObjectId, ref: 'cards' },
  targetType: { type: String, enum: ['card', 'brain'], required: true },
  permission: { type: String, enum: ['view', 'edit'], default: 'view' }
});

export const LinkModel = mongoose.model("links", LinkSchema);