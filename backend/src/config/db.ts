import mongoose from "mongoose";
import crypto from "crypto";
import type { UserInput, CardInput, LinkInput } from "../types/types.js";

const mongoDbUrl = process.env.mongoDbUrl;

if(!mongoDbUrl){
  throw new Error("FATAL ERROR: mongoDB URL is not defined in the environment.");
}

mongoose.connect(mongoDbUrl);
mongoose.set('debug', true);


// Types
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const DateType = Schema.Types.Date;


// Schemas
const Users = new Schema<UserInput>({
  username: { 
    type: String, 
    unique: true, 
    required: true 
  },
  email: { 
    type: String, 
    unique: true, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  age: Number
})

const Tags = new Schema({
  tagName: { 
    type: String, 
    required: true 
  }
})    

const Cards = new Schema<CardInput>({
  createdBy: { 
    type: ObjectId, 
    required: true, 
    ref: 'users' 
  },
  tags: [{ 
    type: ObjectId, 
    ref: 'tags' 
  }],
  title: String,
  description: String,
  note: String,
  editHistory: [{
    editedBy: { 
      type: ObjectId, 
      ref: 'users' 
    },
    editorUsername: String,
    timeStamp: { 
      type: DateType, 
      default: Date.now 
    }
  }]
})

const Link = new Schema<LinkInput>({
  expiresAt: { 
    type: Date, 
    expires: '7d', 
    default: Date.now 
  },
  clickCount: { 
    type: Number, 
    default: 0 
  },
  createdBy: { 
    type: ObjectId, 
    required: true, 
    ref: 'users' 
  },
  token: { 
    type: String, 
    default: () => crypto.randomBytes(16).toString('hex'), 
    required: true, 
    unique: true 
  },
  targetedAt: { 
    type: ObjectId,
    ref: 'cards' 
  },
  targetType: { 
    type: String, 
    enum: ['card', 'brain'], 
    required: true 
  },
  permission: { 
    type: String, 
    enum: ['view', 'edit'], 
    default: 'view' 
  }
})


// models
export const UserModel = mongoose.model("users", Users); 
export const TagModel = mongoose.model("tags", Tags);
export const CardModel = mongoose.model("cards", Cards);
export const LinkModel = mongoose.model("links", Link);