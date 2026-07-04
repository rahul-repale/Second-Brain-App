# RAG search feature - change set

Semantic search over your cards: embed each card locally, store vectors in
Qdrant Cloud (free tier), embed the search query the same way, retrieve the
closest matches scoped to the requesting user.

## Where each file goes (paths already match your repo)
 
| File | Status | What it does |
|---|---|---|
| `src/services/embeddingModel.ts` | NEW | Loads `all-MiniLM-L6-v2` locally via transformers.js, singleton pattern, exposes `embedText()` |
| `src/services/vectorStore.ts` | NEW | Qdrant client, collection setup, `upsertCardVector()`, `deleteCardVector()`, `searchCards()` |
| `src/scripts/backfillCardEmbeddings.ts` | NEW | One-time script to embed every existing card |
| `src/controllers/querySearch.ts` | REPLACED | Was an empty stub that never sent a response. Now does real search. |
| `src/controllers/createCards.ts` | MODIFIED | Fixed `editHistory` field mismatch (`userId/userName` → `editedBy/editorUsername`, matching the schema). Added embedding-on-create. |
| `src/controllers/updateContent.ts` | MODIFIED | Added `{ new: true }` + a null check (previously always said "Card Updated" even on no match). Added re-embedding-on-update. |
| `src/controllers/deleteCard.ts` | MODIFIED | Added vector cleanup on delete. |
| `src/types/types.ts` | MODIFIED | Fixed `editHistory` type to match the corrected field names and use `string` instead of `String`. |
| `tsconfig.json` | MODIFIED | Fixed `"types": []`, which was silently excluding `@types/node` despite it being installed - `process.env` wasn't actually typed anywhere in the project. |
| `.env.example` | NEW | Didn't exist before. Lists every required env var, given the earlier leaked-`.env` history on this project. |

## Setup

```bash
npm install @qdrant/js-client-rest @huggingface/transformers
```

Add to your real `.env` (see `.env.example`):
```
QDRANT_URL=https://xxxxxxxx.xxxx.aws.cloud.qdrant.io
QDRANT_API_KEY=your-key
```

Get those two values free at https://cloud.qdrant.io - create an account,
create a Free Tier cluster, copy the cluster URL and API key it gives you.

Backfill existing cards once:
```bash
npm run build
node dist/scripts/backfillCardEmbeddings.js
```

New cards are indexed automatically going forward (createCards.ts /
updateContent.ts / deleteCard.ts now call the vector store directly).

## Caveats (I couldn't execute any of this - no network in my sandbox)

- Qdrant free-tier clusters auto-suspend after 7 days idle, delete after 28.
  Fine for a personal project, just don't be surprised if you need to
  restart the cluster after a break.
- First run of `embedText()` downloads the MiniLM model (~90MB) and caches
  it under `node_modules/@huggingface/transformers/.cache` - slow once,
  fast after.
- `qdrant.search()`'s exact return shape is documented but I haven't run it
  myself. If TypeScript complains about `point.payload` or `point.score` on
  first build, console.log one raw result and adjust the couple of lines
  in `searchCards()` that read it.
