import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";
import { UserModel } from "../models/User.js"
import mongoose from "mongoose";
import type { CardInput } from "../types/types.js"

export async function createCard(req: Request, res: Response){
  if(!req.userId){
    return res.status(500).json({ err: "Session Timeout, Login again" });
  } 

  const user = await UserModel.findOne({ _id: req.userId })
  if(!user){
    return res.status(403).json({ msg: "Invalid Credentials, Please Login again" })
  }

  const card: CardInput = {
    createdBy: mongoose.Types.ObjectId.createFromHexString(req.userId),
    title: req.body.title,
    description: req.body.description,
    tags: req.body.tags,
    note: req.body.note,
    editHistory: [{
      userId: mongoose.Types.ObjectId.createFromHexString(req.userId),
      userName: user.username as string
    }]
  }
  const input = await CardModel.create(card)
  res.status(200).json(input);
}