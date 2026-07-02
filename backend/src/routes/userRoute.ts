import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { CardModel, LinkModel, UserModel } from "../config/db.js";
import { z } from "zod"
import express from "express";
import jwt from "jsonwebtoken";
import { Auth } from "../middlewares/AuthMiddleware.js";
import mongoose from "mongoose";
import type { CardInput, LinkInput } from "../types/types.js"

import { SignUp } from "../controllers/signUp.js"
import { SignIn } from "../controllers/signIn.js"
import { GetContent } from "../controllers/getContent.js"
import { CreateCard } from "../controllers/createCards.js"

export const UserRouter = express.Router()

// deleteContent Function
async function deleteContent(req: Request, res: Response){
  if(req.userId){
    try{
      await CardModel.deleteMany({ userId: req.userId, _id: req.body.cardId });
      res.status(200).json({ msg: "Card deleted" });
    } catch(err) {
      res.status(500).json({ msg: "Error, Please try again", err });
    }
  } else {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }
}

// updateContent Function
async function updateContent(req: Request, res: Response){
  if(req.userId){
    try{
      await CardModel.findOneAndUpdate({ userId: req.userId, _id: req.body.cardId }, req.body.updatedCard);
      res.status(200).json({ msg: "Card Updated" });
    } catch(err) {
      res.status(500).json({ msg: "Error, Please try again", err });
    }
  } else {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }
}

// createShareLink Function
async function createShareLink(req: Request, res: Response){
  if(!req.userId){
    return res.status(401).json({ err: "Session Timeout, Login again" });
  } 
  try{
    const link: LinkInput = await LinkModel.create({
      createdBy: req.userId,
      targetedAt: req.body.cardId,
      targetType: req.body.type,
      permission: req.body.permission
    })

    return res.status(200).json({ link: link.token });
  } catch(err) {
    res.status(500).json({ msg: "Error, Please try again", err });
  }
}

// fetchSharedLink Function
async function fetchSharedLink(req: Request, res: Response){
  try{
    const link = req.params.shareLink as string;
    const data = await LinkModel.findOne({ token: link });

    if(!data){
      return res.status(403).json({ msg: "Link expired, please create new link" })
    }

    data.clickCount += 1;
    await data.save()
    
    if(data.targetType === "card" && data.targetedAt){
      const card = await CardModel.findOne({ userId: data.createdBy, cardId: data.targetedAt });
      return res.status(200).json({ card, editedBy: req.userId });
    } else if(data.targetType === "brain"){
      const brain = await CardModel.find({ userId: data.createdBy });
      return res.status(200).json({ brain, editedBy: req.userId });
    } else {
      return res.status(400).json({ msg: "something went wrong, please try again" })
    }
  } catch(err) {
    res.status(500).json({ msg: "Error, Please try again", err });
  }
}

// querySerach Function
async function querySerach(req: Request, res: Response){
  if(req.userId){
    const query: string = req.body.query;
    
  } else {
    return res.status(500).json({ err: "Session Timeout, Login again" });
  }
}


// Routes
UserRouter.post("/v1/signup", SignUp);
UserRouter.post("/v1/signin", SignIn);
UserRouter.get("/v1/content", Auth, GetContent);
UserRouter.post("/v1/content", Auth, CreateCard);
UserRouter.delete("/v1/content", Auth, deleteContent);
UserRouter.put("/v1/content", Auth, updateContent);
UserRouter.post("/v1/share", Auth, createShareLink);
UserRouter.get("/v1/:shareLink", fetchSharedLink)
UserRouter.post("/v1/query", Auth, querySerach);