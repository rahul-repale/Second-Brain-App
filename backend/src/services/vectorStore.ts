import mongoose from "mongoose";
import { CardModel } from "../models/Card.js";
import { embedText } from "./embeddingModel.js";

/**
 * Name of the Atlas Vector Search index on the "cards" collection's
 * `embedding` field. Must match whatever you name it when you create
 * the index - see src/scripts/createVectorIndex.ts, which is also the
 * source of truth for the actual index definition (dimensions,
 * similarity function, which fields are filterable).
 */
export const VECTOR_INDEX_NAME = "card_vector_index";

interface CardForEmbedding {
  _id: { toString(): string };
  title: string;
  description?: string;
  note?: string;
  createdBy: { toString(): string };
  // Deliberately loose: in createCards.ts/updateContent.ts, tags are
  // unpopulated ObjectId refs (no name available). In the backfill
  // script, they're populated {tagName} objects. `unknown[]` lets both
  // shapes through; extractTagName() below is what actually narrows it.
  tags?: unknown[];
}

function extractTagName(tag: unknown): string | undefined {
  if (typeof tag === "object" && tag !== null && "tagName" in tag) {
    const { tagName } = tag as { tagName?: unknown };
    return typeof tagName === "string" ? tagName : undefined;
  }
  return undefined;
}

function cardToEmbeddingText(card: CardForEmbedding): string {
  const tagNames = (card.tags ?? [])
    .map(extractTagName)
    .filter((name): name is string => Boolean(name));

  return [card.title, card.description, card.note, tagNames.join(" ")]
    .filter(Boolean)
    .join("\n");
}

/**
 * Embeds a card and writes the vector onto its own MongoDB document.
 * Same name and signature as the old Qdrant-backed version on purpose -
 * createCards.ts, updateContent.ts, and backfillCardEmbeddings.ts all
 * call this and none of them needed to change, because none of them
 * ever knew or cared where the vector actually lived. That's the whole
 * point of putting this behind a service module instead of calling
 * Qdrant/Mongo directly from three different controllers.
 *
 * Uses updateOne() rather than card.save() so this keeps working
 * whether `card` is a real Mongoose document (createCards.ts,
 * updateContent.ts, the backfill script) or just a plain object with
 * the right shape (e.g. in a future test) - it never needs `card` to
 * have a .save() method, only an _id.
 */
export async function upsertCardVector(card: CardForEmbedding): Promise<void> {
  const text = cardToEmbeddingText(card);
  const vector = await embedText(text);

  await CardModel.updateOne(
    { _id: card._id },
    { $set: { embedding: vector } }
  );
}

export interface CardSearchResult {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  tags?: mongoose.Types.ObjectId[];
  editHistory?: unknown[];
  score: number;
}

/**
 * Embeds the query and runs $vectorSearch directly against the "cards"
 * collection - no second round trip to fetch the actual card content,
 * because with everything living in one collection, $vectorSearch
 * already returns the full document.
 *
 * createdBy is enforced as a `filter` INSIDE $vectorSearch (it has to be
 * declared as a "filter"-type field in the index definition for this to
 * work - see createVectorIndex.ts) rather than as a downstream $match
 * only. Filtering after the fact would mean Atlas picks its candidate
 * set from ALL users' cards and only then throws away ones that aren't
 * yours - as your card count grows across all users, that silently
 * shrinks how many of *your* results you actually get back, even
 * though nothing looks wrong from the API response shape. The $match
 * below is a second, redundant check on top of that - not because the
 * filter is expected to fail, but because every prior auth bug in this
 * codebase happened at exactly this kind of single point of failure.
 */
export async function searchCards(
  query: string,
  userId: string,
  limit = 10
): Promise<CardSearchResult[]> {
  const queryVector = await embedText(query);
  const ownerId = new mongoose.Types.ObjectId(userId);

  return CardModel.aggregate<CardSearchResult>([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        // ~20x limit is Atlas's own rule of thumb for good recall (90%+).
        numCandidates: limit * 20,
        limit,
        filter: { createdBy: { $eq: ownerId } }
      }
    },
    { $match: { createdBy: ownerId } },
    { $addFields: { score: { $meta: "vectorSearchScore" } } },
    // Exclusion-only projection - mixing this with inclusions (like the
    // addFields above) in the SAME $project stage is invalid MQL, which
    // is why score is a separate $addFields instead of being folded in
    // here.
    { $project: { embedding: 0 } }
  ]);
}
