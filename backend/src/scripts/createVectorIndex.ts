/**
 * One-time setup: creates the Atlas Vector Search index that
 * searchCards() (src/services/vectorStore.ts) depends on. Safe to run
 * more than once - it checks for an existing index by name first.
 *
 *   npm run build
 *   node dist/scripts/createVectorIndex.js
 *
 * MongoDB's own driver docs say createSearchIndex() works "on all Atlas
 * cluster tiers," but there's conflicting info floating around about
 * shared/free (M0) clusters specifically requiring the Atlas UI instead
 * of the Admin API / driver method for search index management. If this
 * script errors out immediately or hangs, don't fight it - create the
 * same index by hand:
 *
 *   Atlas UI -> your cluster -> "Atlas Search" tab -> Create Search
 *   Index -> JSON Editor -> select your DB and the "cards" collection
 *   -> paste this (adjust nothing unless you changed the embedding
 *   model in embeddingModel.ts):
 *
 *   {
 *     "name": "card_vector_index",
 *     "type": "vectorSearch",
 *     "fields": [
 *       { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "dotProduct" },
 *       { "type": "filter", "path": "createdBy" }
 *     ]
 *   }
 *
 * The "filter" entry on createdBy is not optional - without it,
 * searchCards()'s per-user filter silently has nothing to filter on
 * (see the comment above searchCards() in vectorStore.ts for why that
 * matters).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { CardModel } from "../models/Card.js";
import { EMBEDDING_DIMENSIONS } from "../services/embeddingModel.js";
import { VECTOR_INDEX_NAME } from "../services/vectorStore.js";

// The mongodb driver's own TS types for listSearchIndexes() only describe
// the element as `{ name: string }` - a known gap (Atlas actually returns
// `status`/`queryable`/etc. too, this just isn't reflected in the driver's
// public types yet). This describes the fields this script actually reads.
interface SearchIndexInfo {
  name: string;
  status?: string;
  queryable?: boolean;
}

async function run(): Promise<void> {
  await connectDB();
  const collection = CardModel.collection;

  const existing = (await collection
    .listSearchIndexes(VECTOR_INDEX_NAME)
    .toArray()
    .catch(() => [])) as SearchIndexInfo[];

  if (existing.length > 0) {
    console.log(
      `Index "${VECTOR_INDEX_NAME}" already exists (status: ${existing[0]?.status ?? "unknown"}). ` +
      `Not recreating it - if you need to change the definition, drop it in the Atlas UI first.`
    );
  } else {
    console.log(`Creating "${VECTOR_INDEX_NAME}"...`);
    await collection.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: EMBEDDING_DIMENSIONS,
            // embedText() L2-normalizes every vector it produces, which
            // makes dot product mathematically equivalent to cosine
            // similarity here, and cheaper for Atlas to compute.
            similarity: "dotProduct"
          },
          { type: "filter", path: "createdBy" }
        ]
      }
    });
  }

  console.log("Waiting for the index to become queryable (usually under a minute, can be longer)...");
  let queryable = false;
  while (!queryable) {
    const [index] = (await collection
      .listSearchIndexes(VECTOR_INDEX_NAME)
      .toArray()) as SearchIndexInfo[];
    queryable = Boolean(index?.queryable);
    if (!queryable) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log("Index is ready. querySearch will work now (assuming your cards have embeddings - run backfillCardEmbeddings.ts if not).");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(
    `Index creation failed. If you're on an M0 (free) cluster, this is the known gap - ` +
    `see the comment at the top of this file for the Atlas UI steps instead.`
  );
  console.error(err);
  process.exit(1);
});