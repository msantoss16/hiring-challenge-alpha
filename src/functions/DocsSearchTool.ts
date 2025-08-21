import { Tool } from "@langchain/core/tools";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";

export class DocsSearchTool extends Tool {
  name = "docs_search";
  description = "Busca semântica em documentos internos";

  private store: MemoryVectorStore;

  private constructor(store: MemoryVectorStore) {
    super();
    this.store = store;
  }

  static async fromDocs(allDocs: Document[]) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });
    const chunks = await splitter.splitDocuments(allDocs);
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });
    const store = await MemoryVectorStore.fromDocuments(chunks, embeddings);
    return new DocsSearchTool(store);
  }

  async _call(query: string): Promise<string> {
    const results = await this.store.similaritySearch(query, 4);
    return JSON.stringify(
      results.map((r) => ({
        snippet: r.pageContent.slice(0, 400),
        source: (r.metadata as any)?.source,
        page: (r.metadata as any)?.loc?.pageNumber,
      })),
      null,
      2
    );
  }
}
