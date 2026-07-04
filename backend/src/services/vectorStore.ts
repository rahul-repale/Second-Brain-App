import { QdrantClient } from "@qdrant/js-client-rest";
import { embedText, EMBEDDING_DIMENSIONS } from "./embeddingModel.js";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

if (!QDRANT_URL) {
  throw new Error("FATAL ERROR: QDRANT_URL is not defined in the environment.");
}

if (!QDRANT_API_KEY) {
  throw new Error("FATAL ERROR: QDRANT_API_KEY is not defined in the environment.");
}

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY
});

const COLLECTION_NAME = "cards";
let collectionReady = false;

/**
 * Creates the "cards" collection on first use. getCollection() throws if
 * it doesn't exist yet, which is what we use to detect "needs creating".
 * Cached in-memory after the first successful check so we're not making
 * a round trip to Qdrant on every single request.
 */
export async function ensureCollection(): Promise<void> {
  if (collectionReady) return;

  try {
    await qdrant.getCollection(COLLECTION_NAME);
  } catch {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSIONS,
        distance: "Cosine"
      }
    });
  }

  collectionReady = true;
}

/**
 * Qdrant point IDs must be an unsigned integer or a UUID - a raw Mongo
 * ObjectId (24 hex chars) is neither shape. Rather than maintain a
 * separate id-mapping table, we deterministically pad the ObjectId's hex
 * into a valid UUID string. Same cardId always produces the same point
 * id, so re-indexing a card overwrites its old vector instead of
 * duplicating it.
 */
export function cardIdToPointId(cardId: string): string {
  const padded = cardId.padStart(32, "0");
  return [
    padded.slice(0, 8),
    padded.slice(8, 12),
    padded.slice(12, 16),
    padded.slice(16, 20),
    padded.slice(20, 32)
  ].join("-");
}

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
 * Embeds a card and upserts it into Qdrant. Call this any time a card is
 * created or updated - it's what keeps the search index from going
 * stale relative to MongoDB. If tags aren't populated, they're just
 * skipped in the embedding text (title/description/note still get used).
 */
export async function upsertCardVector(card: CardForEmbedding): Promise<void> {
  await ensureCollection();
  const text = cardToEmbeddingText(card);
  const vector = await embedText(text);

  await qdrant.upsert(COLLECTION_NAME, {
    points: [
      {
        id: cardIdToPointId(card._id.toString()),
        vector,
        payload: {
          cardId: card._id.toString(),
          createdBy: card.createdBy.toString(),
          title: card.title
        }
      }
    ]
  });
}

export async function deleteCardVector(cardId: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    points: [cardIdToPointId(cardId)]
  });
}

export interface CardMatch {
  cardId: string;
  score: number;
}

/**
 * Embeds the query and searches Qdrant, filtered to only this user's
 * cards. The filter is enforced here AND again in querySearch.ts when we
 * re-fetch the cards from MongoDB - never rely on a single layer for
 * per-user isolation, given this app's history with authorization bugs.
 */
export async function searchCards(query: string, userId: string, limit = 10): Promise<CardMatch[]> {
  await ensureCollection();
  const vector = await embedText(query);

  const results = await qdrant.search(COLLECTION_NAME, {
    vector,
    filter: {
      must: [{ key: "createdBy", match: { value: userId } }]
    },
    with_payload: true,
    limit
  });

  return results
    .map((point) => {
      const cardId = point.payload?.cardId;
      return typeof cardId === "string" ? { cardId, score: point.score } : null;
    })
    .filter((match): match is CardMatch => match !== null);
}
