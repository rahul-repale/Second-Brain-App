import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { MyAuthJwtPayload } from "../types/types.js";

const JWT_SECRET = process.env.JWT_SECRET;

if(!JWT_SECRET){
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in the environment.");
}

export const Auth = function(req: Request, res: Response, next: NextFunction){
  const token = req.headers.authorization;
  if(token){
    const decodedUser = jwt.verify(token, JWT_SECRET) as MyAuthJwtPayload; 
    const userId = decodedUser.userId;
    
    if(userId) {
      req.userId = userId;
      next();
    } else {
      return res.status(401).json({ err: "Invalid Credentials, Go to Signin Again" })
    }

  } else {
    return res.status(403).json({ err: 'Token expired, Go to SignIn again' });
  }
}

