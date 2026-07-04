import type { Request, Response } from "express";
import { LinkModel } from "../models/Link.js";
import mongoose from "mongoose";
import { CardModel } from "../models/Card.js"
import type { LinkInput, CardInput } from "../types/types.js"

export async function createShareLink(req: Request, res: Response){
  if(!req.userId){
    return res.status(401).json({ err: "Session Timeout, Login again" });
  } 
  try{
    const card: CardInput | null = await CardModel.findOne({ _id: req.body.cardId, createdBy: req.userId });
    
    if(!card){
      return res.status(403).json({ msg: "this card doesn't belong to this user" })
    }

    const link: LinkInput = await LinkModel.create({
      createdBy: mongoose.Types.ObjectId.createFromHexString(req.userId),
      targetedAt: mongoose.Types.ObjectId.createFromHexString(req.body.cardId),
      targetType: req.body.type,
      permission: req.body.permission
    })

    return res.status(200).json({ link: link.token });
  } catch(err) {
    res.status(500).json({ msg: "Error, Please try again", err });
  }
}