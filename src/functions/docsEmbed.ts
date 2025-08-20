import fs from "fs";
import path from "path";
import { CONFIG } from "../config.ts";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

let vectorStore: MemoryVectorStore | null = null;

/**
 * Lê todos os arquivos .txt na pasta configurada,
 * gera embeddings e armazena em memória.
 */
export async function embedDocuments(): Promise<void> {
  const files = fs
    .readdirSync(CONFIG.data.docsDir)
    .filter((f) => f.endsWith(".txt"));

  if (files.length === 0) {
    console.warn("[Embeddings] Nenhum arquivo .txt encontrado para indexação");
    return;
  }

  const documents: Document[] = files.map((file) => {
    const content = fs.readFileSync(
      path.join(CONFIG.data.docsDir, file),
      "utf-8"
    );
    return new Document({
      pageContent: content,
      metadata: { source: file },
    });
  });

  const embeddings = new OpenAIEmbeddings({ apiKey: CONFIG.openaiApiKey });

  vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

  console.log(
    `[Embeddings] Indexação concluída. ${files.length} documentos adicionados`
  );
}

/**
 * Busca semântica nos documentos indexados via embeddings.
 * Retorna apenas documentos acima de um score mínimo.
 * @param query Texto a ser buscado
 * @param k Número de resultados (default: 2)
 * @param minScore Score mínimo para considerar um documento relevante (0 a 1)
 */
export async function searchWithEmbeddings(
  query: string,
  k = 2,
  minScore = 0.7
): Promise<string[]> {
  if (!vectorStore) {
    console.warn(
      "[Embeddings] Nenhuma base carregada. Execute embedDocuments() primeiro"
    );
    return [];
  }

  // Faz a busca semântica
  const results = await vectorStore.similaritySearchWithScore(query, k);

  // Filtra resultados abaixo do minScore
  const relevant = results.filter((r) => r[1] >= minScore);

  return relevant.map((r) => r[0].pageContent);
}
