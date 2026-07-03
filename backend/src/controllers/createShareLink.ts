import type { Request, Response } from "express";
import { LinkModel } from "../models/Link.js";
import type { LinkInput } from "../types/types.js"

export async function createShareLink(req: Request, res: Response){
  if(!req.userId){
    return res.status(401).json({ err: "Session Timeout, Login again" });
  } 
  try{
    const link: LinkInput = await LinkModel.create({
      createdBy: req.userId,
      targetedAt: req.body.cardId,
      targetType: req.body.type,
      permission: req.body.permission
    })

    return res.status(200).json({ link: link.token });
  } catch(err) {
    res.status(500).json({ msg: "Error, Please try again", err });
  }
}