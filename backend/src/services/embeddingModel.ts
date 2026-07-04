import { pipeline } from "@huggingface/transformers";

/**
 * all-MiniLM-L6-v2 outputs 384-dim vectors. If you ever swap models,
 * this constant is the only other place (besides the Qdrant collection
 * config in vectorStore.ts) that needs to change.
 */
export const EMBEDDING_DIMENSIONS = 384;
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

interface EmbeddingTensor {
  tolist(): number[][];
}

type Extractor = (
  text: string,
  options: { pooling: "mean" | "cls" | "none"; normalize: boolean }
) => Promise<EmbeddingTensor>;

// transformers.js's exported type for a pipeline instance isn't something
// I can guarantee the exact name of across versions, so we cast once at
// this boundary and keep a narrow, controlled type for everything that
// calls embedText(). This is the same idea as writing a small adapter
// around a third-party library whose types you don't fully trust.
let extractor: Extractor | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractor) {
    // First call downloads and caches the model (~90MB) under
    // node_modules/@huggingface/transformers/.cache by default.
    // Every call after that reuses this same in-memory instance -
    // do NOT call pipeline() per-request, it's expensive to load.
    extractor = (await pipeline("feature-extraction", MODEL_NAME)) as unknown as Extractor;
  }
  return extractor;
}

/**
 * Turns a string into a 384-dim embedding vector.
 * normalize: true makes the output L2-normalized, which is what you want
 * when the vector DB's distance metric is Cosine (see vectorStore.ts).
 */
export async function embedText(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  const [vector] = output.tolist();

  if (!vector) {
    throw new Error("Failed to generate embedding: model returned no output.");
  }

  return vector;
}
