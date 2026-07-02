import mongoose from "mongoose";

const Schema = mongoose.Schema;

const TagSchema = new Schema({
  tagName: { type: String, required: true }
});

export const TagModel = mongoose.model("tags", TagSchema);