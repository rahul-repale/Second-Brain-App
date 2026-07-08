import type { Request, Response } from "express";
import { LinkModel } from "../models/Link.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export async function revokeShareLink(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }

  const linkId = req.params.linkId;
  if (!linkId || !OBJECT_ID_RE.test(linkId)) {
    return res.status(400).json({ msg: "Invalid link id" });
  }

  try {
    const result = await LinkModel.updateOne(
      { _id: linkId, createdBy: req.userId },
      { $set: { revoked: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: "Share link not found" });
    }

    return res.status(200).json({ msg: "Share link revoked" });
  } catch (err) {
    res.status(500).json({ msg: "Error, Please try again" });
  }
}
