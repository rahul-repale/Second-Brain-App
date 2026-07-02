import mongoose from "mongoose";
import type { UserInput } from "../types/types.js";

const Schema = mongoose.Schema;

const UserSchema = new Schema<UserInput>({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  age: Number
});

export const UserModel = mongoose.model("users", UserSchema);