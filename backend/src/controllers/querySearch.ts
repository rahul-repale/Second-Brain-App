import type { Request, Response } from "express";
import { z } from "zod";
import { CardModel } from "../models/Card.js";
import { searchCards } from "../services/vectorStore.js";
 
const querySchema = z.object({
  query: z.string().trim().min(1, "query cannot be empty").max(500, "query is too long")
});

export async function querySearch(req: Request, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ err: "Session Timeout, Login again" });
  }

  const safeBody = querySchema.safeParse(req.body);
  if (!safeBody.success) {
    return res.status(411).json(safeBody.error.issues);
  }

  try {
    const matches = await searchCards(safeBody.data.query, req.userId);

    if (matches.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const cardIds = matches.map((match) => match.cardId);
    const cards = await CardModel.find({
      _id: { $in: cardIds },
      createdBy: req.userId
    });

    const cardById = new Map(cards.map((card) => [card._id.toString(), card]));

    const results = matches
      .map((match) => {
        const card = cardById.get(match.cardId);
        return card ? { card, score: match.score } : null;
      })
      .filter((result): result is { card: (typeof cards)[number]; score: number } => result !== null);

    return res.status(200).json({ results });
  } catch (err) {
    console.error("querySearch failed:", err);
    return res.status(500).json({ msg: "Error, Please try again" });
  }
}
