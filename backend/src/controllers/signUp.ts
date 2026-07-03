import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/User.js";
import { z } from "zod"

export const signUp = async function(req: Request, res: Response) {
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