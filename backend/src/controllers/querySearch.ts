import type { Request, Response } from "express";
import { z } from "zod";
import { searchCards } from "../services/vectorStore.js";

const querySchema = z.object({
  query: z.string().trim().min(1, "query cannot be empty").max(500, "query is too long"),
  limit: z.number().int().min(1).max(25).optional()
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
    const results = await searchCards(
      safeBody.data.query,
      req.userId,
      safeBody.data.limit ?? 10
    );

    return res.status(200).json({ results });
  } catch (err) {
    console.error("querySearch failed:", err);
    return res.status(500).json({ msg: "Error, Please try again" });
  }
}
