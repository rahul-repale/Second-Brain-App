import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { CardModel, LinkModel, UserModel } from "../config/db.js";
import { z } from "zod"
import express from "express";
import jwt from "jsonwebtoken";
import { Auth } from "../middlewares/AuthMiddleware.js";
import mongoose from "mongoose";
import type { CardInput, LinkInput } from "../types/types.js"

const JWT_SECRET = process.env.JWT_SECRET;

if(!JWT_SECRET){
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in the environment.");
}

export const UserRouter = express.Router()

// SignUp Function
const SignUp = async function(req: Request, res: Response) {
  try {
    const signUpSchema = z.object({
      username: z.string()
        .min(3, "username should have atleast 3 characters")
        .max(15, "username should have atmost 15 characters"),
      password: z.string()
        .min(8, "password should have atleast 8 characters")
        .max(20, "password should have atmost 20 characters")
        .regex(/[a-z]/, "password should have atleast one lowercase character")
        .regex(/[A-Z]/, "password should have atleast one uppercase character")
        .regex(/[0-9]/, "password should have atleast one number"),
      email: z.email("email should be in proper format"),
      age: z.number().min(12, "age should be above 12")
    });

    const safeBody = signUpSchema.safeParse(req.body)
  
    if(safeBody.success){
      const username: string = safeBody.data.username;
      const password: string = safeBody.data.password;
      const email: string = safeBody.data.email;
      const age: number = safeBody.data.age;

      const user = await UserModel.findOne({ username });

      if(user){
        return res.status(403).json({
          err: "user already exists, go to signin"
        })
      }
// Make services of user db calls
      const hashedPassword: string = await bcrypt.hash(password, 5)
    
      await UserModel.create({
        username,
        password: hashedPassword,
        email,
        age
      })
    
      res.status(200).json({
        msg: "you signedup successfully"
      })
    } else {
      res.status(411).json(safeBody.error.issues);
    }
 
  } catch(err) {
    res.status(500).json(err);
  }
}

// SignIn Function
const SignIn = async function(req: Request, res: Response){
  try{
    const signInSchema = z.object({
      username: z.string()
        .min(3, "username should have atleast 3 characters")
        .max(15, "username should have atmost 15 characters"),
      password: z.string()
        .min(8, "password should have atleast 8 characters")
        .max(20, "password should have atmost 20 characters")
        .regex(/[a-z]/, "password should have atleast one lowercase character")
        .regex(/[A-Z]/, "password should have atleast one uppercase character")
        .regex(/[0-9]/, "password should have atleast one number"),
    });
    
    const safeBody = signInSchema.safeParse(req.body);
  
    if(safeBody.success){
      const username: string = safeBody.data.username;
      const password: string = safeBody.data.password;

      const userExist = await UserModel.findOne({ username });

      if(!userExist){
        return res.status(403).json({
          msg: "Invalid Credentials, Username not found"
        })
      }
      
      const passwordMatch = await bcrypt.compare(password, userExist.password);

      if(passwordMatch){
        const userId: string = userExist._id.toString();
        const token: string = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7D" });
        // localStorage.setItem("token", token);

        return res.status(200).json({
          msg: "you are loged in successfully",
          token
        })
      } else {
        return res.status(411).json({
          err: "Password does not match"
        })
      }
    } else {
      res.status(411).json(safeBody.error.issues);
    }
  } catch(err) {
    res.status(500).json(err);
  }
}

// GetContent function
async function GetContent(req: Request, res: Response){
  if(req.userId){
    const content = await CardModel.find({ userId: req.userId })
    return res.status(200).json(content);
  } else {
    return res.status(500).json({ err: "Session Timeout, Login again" });
  }
}

// CreateCard Function
async function CreateCard(req: Request, res: Response){
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