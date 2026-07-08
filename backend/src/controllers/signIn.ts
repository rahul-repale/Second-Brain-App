import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/User.js";
import { z } from "zod"
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if(!JWT_SECRET){
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in the environment.");
}

export const signIn = async function(req: Request, res: Response){
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
          msg: "Invalid Credentials"
        })
      }
      
      const passwordMatch = await bcrypt.compare(password, userExist.password);

      if(passwordMatch){
        const userId: string = userExist._id.toString();
        const token: string = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

        return res.status(200).json({
          msg: "you are loged in successfully",
          token
        })
      } else {
        return res.status(411).json({
          err: "Invalid Credentials"
        })
      }
    } else {
      res.status(411).json(safeBody.error.issues);
    }
  } catch(err) {
    res.status(500).json(err);
  }
}
