import fs from "fs";
import path from "path";
import { Document } from "@langchain/core/documents";
import { CONFIG } from "../AgentConfigs/config.ts";
import { DocsSearchTool } from "./DocsSearchTool.ts";

let docsTool: DocsSearchTool | null = null;

export async function initDocsSearch(incremental = false): Promise<void> {
  const dir = CONFIG.data.docsDir;
  if (!fs.existsSync(dir)) {
    console.warn(`[DocsSearch] Diretório não existe: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.warn("[DocsSearch] Nenhum arquivo .txt encontrado para indexação");
    return;
  }

  const allDocs: Document[] = files.map((file) => {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    return new Document({ pageContent: content, metadata: { source: file } });
  });

  docsTool = await DocsSearchTool.fromDocs(allDocs);
  console.log(
    `[DocsSearch] Indexação concluída. ${files.length} documentos carregados`
  );
}

export async function searchDocs(query: string, k = 3): Promise<string[]> {
  if (!docsTool) {
    console.warn(
      "[DocsSearch] Nenhuma base carregada. Execute initDocsSearch() primeiro"
    );
    return [];
  }

  try {
    const raw = await docsTool._call(query);
    const parsed: Array<{ snippet: string; source?: string; page?: number }> =
      JSON.parse(raw);
    return parsed.slice(0, k).map((r) => r.snippet);
  } catch (e) {
    console.error("[DocsSearch] Erro ao buscar:", e);
    return [];
  }
}
