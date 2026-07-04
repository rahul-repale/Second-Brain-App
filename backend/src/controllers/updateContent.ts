import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";
import { upsertCardVector } from "../services/vectorStore.js";

export async function updateContent(req: Request, res: Response){
  if(req.userId){
    try{
      const updated = await CardModel.findOneAndUpdate(
        { createdBy: req.userId, _id: req.body.cardId },
        req.body.updatedCard,
        { new: true }
      );

      if(!updated){
        return res.status(404).json({ msg: "Card not found" });
      }

      try {
        await upsertCardVector(updated);
      } catch (err) {
        console.error(`Failed to re-index card ${updated._id.toString()} for search:`, err);
      }

      res.status(200).json({ msg: "Card Updated" });
    } catch(err) {
      res.status(500).json({ msg: "Error, Please try again", err });
    }
  } else {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }
}
