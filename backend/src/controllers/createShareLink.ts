import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import { z } from "zod";
import { LinkModel } from "../models/Link.js";
import { CardModel } from "../models/Card.js";

const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 90;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const shareSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("card"),
    cardId: z.string().regex(OBJECT_ID_RE, "cardId must be a valid id"),
    permission: z.enum(["view", "edit"]).default("view"),
    expiresInDays: z.number().int().min(1).max(MAX_EXPIRY_DAYS).nullable().optional(),
  }),
  z.object({
    type: z.literal("brain"),
    permission: z.enum(["view", "edit"]).default("view"),
    expiresInDays: z.number().int().min(1).max(MAX_EXPIRY_DAYS).nullable().optional(),
  }),
]);

function buildShareUrl(token: string): string {
  const base = process.env.CLIENT_URL;
  return base ? `${base.replace(/\/$/, "")}/shared/${token}` : `/user/v1/share/${token}`;
}

export async function createShareLink(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }

  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json(parsed.error.issues);
  }

  const ownerId = mongoose.Types.ObjectId.createFromHexString(req.userId);
  const { permission, expiresInDays } = parsed.data;

  try {
    let targetedAt: mongoose.Types.ObjectId | undefined;

    if (parsed.data.type === "card") {
      const card = await CardModel.findOne({ _id: parsed.data.cardId, createdBy: ownerId });
      if (!card) {
        return res.status(404).json({ msg: "Card not found, or it doesn't belong to you" });
      }
      targetedAt = card._id;
    }

    const expiresAt =
      expiresInDays === null
        ? null
        : new Date(Date.now() + (expiresInDays ?? DEFAULT_EXPIRY_DAYS) * 24 * 60 * 60 * 1000);

    const filter =
      parsed.data.type === "card"
        ? { createdBy: ownerId, targetType: "card" as const, targetedAt, revoked: false }
        : { createdBy: ownerId, targetType: "brain" as const, revoked: false };

    const update = {
      $set: { permission, expiresAt },
      $setOnInsert: {
        createdBy: ownerId,
        targetType: parsed.data.type,
        ...(targetedAt ? { targetedAt } : {}),
        token: crypto.randomBytes(20).toString("hex"),
      },
    };

    let link;
    try {
      link = await LinkModel.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        link = await LinkModel.findOne(filter);
      }
      if (!link) throw err;
    }

    return res.status(200).json({
      token: link.token,
      permission: link.permission,
      expiresAt: link.expiresAt,
      shareUrl: buildShareUrl(link.token),
    });
  } catch (err) {
    res.status(500).json({ msg: "Error, Please try again" });
  }
}
