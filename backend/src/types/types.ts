import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Routes
export interface MyAuthJwtPayload extends jwt.JwtPayload {
  userId: string
}

// Databases
type ObjectId = mongoose.Types.ObjectId;
type Date = mongoose.Schema.Types.Date;

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
  editHistory?: [{
    userId: ObjectId,
    userName: String,
    timeStamp?: Date;
  }];
} 

export interface LinkInput {
  createdBy: ObjectId;
  token?: string;
  expiresAt: Date;
  clickCount: number;
  targetedAt?: ObjectId; 
  targetType: string;
  permission: string;
}