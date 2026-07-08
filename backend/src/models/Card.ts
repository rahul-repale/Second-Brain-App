import mongoose from "mongoose";
import type { CardInput } from "../types/types.js";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const DateType = Schema.Types.Date;

const CardSchema = new Schema<CardInput>({
  createdBy: { type: ObjectId, required: true, ref: 'users' },
  tags: [{ type: ObjectId, ref: 'tags' }],
  title: String,
  description: String,
  note: String,
  editHistory: [{ 
    userId: { type: ObjectId, ref: 'users' },
    userName: String,
    timeStamp: { type: DateType, default: Date.now }
  }],
  embedding: { type: [Number], select: false }
});

CardSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.embedding;
    return ret;
  }
});

export const CardModel = mongoose.model("cards", CardSchema);
