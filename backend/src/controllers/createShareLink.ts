import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import { z } from "zod";
import { LinkModel } from "../models/Link.js";
import { CardModel } from "../models/Card.js";
import type { LinkInput } from "../types/types.js";

const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 90;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Discriminated on `type` so each branch only demands what it actually needs -
// a "brain" share has no single card to validate ownership against, and the
// old code's single shape (always requiring cardId) is exactly what made
// whole-brain sharing behave oddly.
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
    // Built per-branch (rather than one ternary reusing a shared
    // `targetedAt` variable) so each branch's object is fully and exactly
    // typed against LinkInput - with exactOptionalPropertyTypes on, a
    // `targetedAt: ObjectId | undefined` (present-but-possibly-undefined)
    // does not satisfy `targetedAt?: ObjectId` (absent-or-ObjectId), even
    // though they look interchangeable at runtime.
    let targetedAt: mongoose.Types.ObjectId | undefined;
    let filter: mongoose.QueryFilter<LinkInput>;

    if (parsed.data.type === "card") {
      const card = await CardModel.findOne({ _id: parsed.data.cardId, createdBy: ownerId });
      if (!card) {
        return res.status(404).json({ msg: "Card not found, or it doesn't belong to you" });
      }
      targetedAt = card._id;
      filter = { createdBy: ownerId, targetType: "card", targetedAt: card._id, revoked: false };
    } else {
      // type === "brain": nothing to look up - the share covers everything
      // this user owns, resolved at fetch time, not at creation time.
      filter = { createdBy: ownerId, targetType: "brain", revoked: false };
    }

    const expiresAt =
      expiresInDays === null
        ? null
        : new Date(Date.now() + (expiresInDays ?? DEFAULT_EXPIRY_DAYS) * 24 * 60 * 60 * 1000);

    // One live link per (owner, target): re-sharing something you already
    // share just updates permission/expiry on the existing link instead of
    // minting a fresh token every time the "share" button is clicked. That
    // also means revocation is unambiguous - there's only ever one thing to
    // revoke per target.
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
      // Two near-simultaneous requests (e.g. a double-clicked share button)
      // can both miss the upsert match and race to insert - the partial
      // unique index on Link rejects the loser with E11000. Rather than
      // surface that as a 500, just read back the link the winner created.
      if (err?.code === 11000) {
        link = await LinkModel.findOne(filter);
      }
      if (!link) throw err;
    }

    if (!link) {
      // Unreachable in practice - upsert:true guarantees findOneAndUpdate
      // returns a document, and the catch-and-refetch path above already
      // throws if that comes up empty - but this is what actually narrows
      // `link` from "possibly null" for the property accesses below.
      return res.status(500).json({ msg: "Error, Please try again" });
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