import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";

export async function deleteContent(req: Request, res: Response){
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