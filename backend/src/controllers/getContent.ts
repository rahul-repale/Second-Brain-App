import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";

export async function getContent(req: Request, res: Response){
  if(req.userId){
    const content = await CardModel.find({ createdBy: req.userId })
    return res.status(200).json(content);
  } else {
    return res.status(500).json({ err: "Session Timeout, Login again" });
  }
}
