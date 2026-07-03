import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { MyAuthJwtPayload } from "../types/types.js";

const JWT_SECRET = process.env.JWT_SECRET;

if(!JWT_SECRET){
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in the environment.");
}

export const auth = function(req: Request, res: Response, next: NextFunction){
  const token = req.headers.authorization;
  if(token){
    try {
      const decodedUser = jwt.verify(token, JWT_SECRET) as MyAuthJwtPayload;
      if(decodedUser.userId) { 
        req.userId = decodedUser.userId; 
        return next(); 
      }
      return res.status(401).json({ err: "Invalid token" });
    } catch {
      return res.status(401).json({ err: "Invalid or expired token" });
    }
  } else {
    return res.status(403).json({ err: 'Token expired, Go to SignIn again' });
  }
}

