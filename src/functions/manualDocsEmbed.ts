import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { CONFIG } from "../config.js";

const client = new OpenAI({ apiKey: CONFIG.openaiApiKey });

let memoryStore: { content: string; embedding: number[] }[] = [];

/**
 * Gera e armazena embeddings para os documentos .txt
 */
export async function embedDocuments() {
  const docsPath = path.join(__dirname, "../documents");
  const files = fs.readdirSync(docsPath).filter((f) => f.endsWith(".txt"));

  for (const file of files) {
    const filePath = path.join(docsPath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const embedding = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    });

    memoryStore.push({
      content,
      embedding: embedding.data[0].embedding,
    });

    console.log(`Documento indexado: ${file}`);
  }

  console.log(`quantidade de documentos indexados: ${memoryStore.length}`);
}

/**
 * Busca semântica nos documentos usando embeddings
 */
export async function searchWithEmbeddings(
  query: string,
  topK: number = 3
): Promise<{ content: string; score: number }[]> {
  if (memoryStore.length === 0) {
    throw new Error(
      "Nenhum documento indexado. Rode embedDocuments() primeiro."
    );
  }

  // Cria embedding da query
  const embedding = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const queryEmbedding = embedding.data[0].embedding;

  // Script que calcula similaridade de cosseno entre query e documentos -> https://stackoverflow.blog/2023/11/09/an-intuitive-introduction-to-text-embeddings/
  function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
  }

  const results = memoryStore
    .map((doc) => ({
      content: doc.content,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}
