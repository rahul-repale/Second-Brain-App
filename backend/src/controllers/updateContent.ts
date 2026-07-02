import type { Request, Response } from "express";
import { CardModel } from "../config/db.js";

export async function updateContent(req: Request, res: Response){
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