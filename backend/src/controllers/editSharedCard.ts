import type { Request, Response } from "express";
import { z } from "zod";
import { CardModel } from "../models/Card.js";
import { findLiveLink, PUBLIC_CARD_FIELDS } from "./fetchSharedBrain.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const editCardSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(10_000).optional(),
    note: z.string().max(10_000).optional(),
    tags: z.array(z.string().regex(OBJECT_ID_RE)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable field (title, description, note, tags) must be provided",
  });

export async function editSharedCard(req: Request, res: Response) {
  const token = req.params.shareLink as string;

  const parsed = editCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json(parsed.error.issues);
  }

  try {
    const link = await findLiveLink(token);
    if (!link) {
      return res.status(404).json({ msg: "This link is invalid or has expired" });
    }

    if (link.targetType !== "card") {
      return res.status(400).json({ msg: "Editing isn't supported for whole-brain shares" });
    }

    if (!link.targetedAt) {
      return res.status(404).json({ msg: "The shared card no longer exists" });
    }

    if (link.permission !== "edit") {
      return res.status(403).json({ msg: "This link is view-only" });
    }

    const card = await CardModel.findOneAndUpdate(
      { _id: link.targetedAt, createdBy: link.createdBy },
      {
        $set: parsed.data,
        $push: {
          editHistory: {
            userName: "Anonymous (edited via shared link)",
            timeStamp: new Date(),
          },
        },
      },
      { new: true }
    ).select(PUBLIC_CARD_FIELDS);

    if (!card) {
      return res.status(404).json({ msg: "The shared card no longer exists" });
    }

    return res.status(200).json({ msg: "Card updated", card });
  } catch (err) {
    res.status(500).json({ msg: "Error, Please try again" });
  }
}
