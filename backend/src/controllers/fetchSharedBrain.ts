import type { Request, Response } from "express";
import { CardModel } from "../models/Card.js";
import { LinkModel } from "../models/Link.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const PUBLIC_CARD_FIELDS = "title description note tags";

export async function findLiveLink(token: string) {
  return LinkModel.findOne({
    token,
    revoked: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
}

export async function fetchSharedLink(req: Request, res: Response) {
  try {
    const token = req.params.shareLink as string;
    const data = await findLiveLink(token);

    if (!data) {
      return res.status(404).json({ msg: "This link is invalid or has expired" });
    }

    LinkModel.updateOne({ _id: data._id }, { $inc: { clickCount: 1 } }).catch(() => {});

    if (data.targetType === "card") {
      const card = await CardModel.findOne({ createdBy: data.createdBy, _id: data.targetedAt })
        .select(PUBLIC_CARD_FIELDS);
      if (!card) {
        return res.status(404).json({ msg: "The shared card no longer exists" });
      }
      return res.status(200).json({ type: "card", permission: data.permission, card });
    }
    
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE));

    const [cards, total] = await Promise.all([
      CardModel.find({ createdBy: data.createdBy })
        .select(PUBLIC_CARD_FIELDS)
        .skip((page - 1) * limit)
        .limit(limit),
      CardModel.countDocuments({ createdBy: data.createdBy }),
    ]);

    return res.status(200).json({
      type: "brain",
      permission: data.permission,
      cards,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ msg: "Error, Please try again" });
  }
}
