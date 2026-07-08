import mongoose from "mongoose";
import crypto from "crypto";
import type { LinkInput } from "../types/types.js";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const LinkSchema = new Schema<LinkInput>({
  createdBy: { type: ObjectId, required: true, ref: 'users', index: true },
  token: {
    type: String,
    default: () => crypto.randomBytes(20).toString('hex'),
    required: true,
    unique: true
  },
  targetedAt: { type: ObjectId, ref: 'cards' },
  targetType: { type: String, enum: ['card', 'brain'], required: true },
  permission: { type: String, enum: ['view', 'edit'], default: 'view', required: true },
  expiresAt: { type: Date, default: null },
  revoked: { type: Boolean, default: false },
  clickCount: { type: Number, default: 0 }
}, { timestamps: true });

LinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

LinkSchema.index(
  { createdBy: 1, targetType: 1, targetedAt: 1 },
  { unique: true, partialFilterExpression: { revoked: false } }
);

export const LinkModel = mongoose.model("links", LinkSchema);
