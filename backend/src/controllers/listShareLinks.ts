import type { Request, Response } from "express";
import { LinkModel } from "../models/Link.js";

export async function listShareLinks(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }

  try {
    const links = await LinkModel.find({ createdBy: req.userId, revoked: false })
      .select("_id targetType targetedAt permission expiresAt clickCount createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({ links });
  } catch (err) {
    res.status(500).json({ msg: "Error, Please try again" });
  }
}
