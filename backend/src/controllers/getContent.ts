import type { Request, Response } from "express";
import { CardModel } from "../config/db.js";

export async function GetContent(req: Request, res: Response){
  if(req.userId){
    const content = await CardModel.find({ userId: req.userId })
    return res.status(200).json(content);
  } else {
    return res.status(500).json({ err: "Session Timeout, Login again" });
  }
}