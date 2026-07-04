import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";
import { deleteCardVector } from "../services/vectorStore.js";
 
export async function deleteContent(req: Request, res: Response){
  if(req.userId){
    try{
      await CardModel.deleteMany({ createdBy: req.userId, _id: req.body.cardId });

      try {
        await deleteCardVector(req.body.cardId);
      } catch (err) {
        console.error(`Failed to remove card ${req.body.cardId} from search index:`, err);
      }

      res.status(200).json({ msg: "Card deleted" });
    } catch(err) {
      res.status(500).json({ msg: "Error, Please try again", err });
    }
  } else {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }
}
