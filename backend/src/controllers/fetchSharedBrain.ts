import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";
import { LinkModel } from "../models/Link.js";

export async function fetchSharedLink(req: Request, res: Response){
  try{
    const link = req.params.shareLink as string;
    const data = await LinkModel.findOne({ token: link });

    if(!data){
      return res.status(403).json({ msg: "Link expired, please create new link" })
    }

    data.clickCount += 1;
    await data.save()
    
    if(data.targetType === "card" && data.targetedAt){
      const card = await CardModel.findOne({ userId: data.createdBy, cardId: data.targetedAt });
      return res.status(200).json({ card, editedBy: req.userId });
    } else if(data.targetType === "brain"){
      const brain = await CardModel.find({ userId: data.createdBy });
      return res.status(200).json({ brain, editedBy: req.userId });
    } else {
      return res.status(400).json({ msg: "something went wrong, please try again" })
    }
  } catch(err) {
    res.status(500).json({ msg: "Error, Please try again", err });
  }
}