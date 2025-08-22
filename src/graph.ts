import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableLambda } from "@langchain/core/runnables";
import { z } from "zod";

import {
  SYSTEM_ROUTER_MULTI,
  SYSTEM_ANSWERER,
} from "./AgentConfigs/prompts.ts";
import { searchDocs } from "./functions/docsSearch.ts";
import { queryAllDBs } from "./functions/sqliteFunction.ts";
import { searchInternet } from "./functions/internetSearch.ts";

// --- Schema do estado com Zod ---
const AgentStateSchema = z.object({
  question: z.string(),
  routes: z.array(z.enum(["SQL", "DOCS", "WEB"])).optional(),
  evidences: z.array(z.any()).optional(),
  citations: z.array(z.string()).optional(),
  finalAnswer: z.string().optional(),
});

// --- Inicializa LLM ---
const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

// --- Nodes ---

// Roteador
const routeNode = new RunnableLambda({
  func: async (state) => {
    const res = await model.invoke([
      { role: "system", content: SYSTEM_ROUTER_MULTI },
      { role: "user", content: state.question },
    ]);

    let raw = "";
    if (typeof res.content === "string") raw = res.content.trim();
    else if (Array.isArray(res.content))
      raw = res.content
        .map((c) => c.text || c)
        .join("")
        .trim();

    let routes: ("SQL" | "DOCS" | "WEB")[] = [];
    try {
      routes = JSON.parse(raw);
    } catch {
      if (/SQL/i.test(raw)) routes.push("SQL");
      if (/DOCS/i.test(raw)) routes.push("DOCS");
      if (/WEB/i.test(raw)) routes.push("WEB");
    }
    if (routes.length === 0) routes = ["WEB"];

    return { ...state, routes };
  },
});

// executor de ferramentas
export const toolNode = new RunnableLambda({
  func: async (state: any) => {
    const evidences: any[] = [];
    const citations: string[] = [];

    const routes = state.routes ?? [];
    const useSQL = routes.includes("SQL") || routes.includes("WEB");
    const useDOCS = routes.includes("DOCS") || routes.includes("WEB");
    const useWEB = routes.includes("WEB");

    // ---------------- SQL: percorre todos os DBs ----------------
    if (useSQL) {
      try {
        const dbResults = await queryAllDBs();
        let fontes: string[] = [];
        for (const dbResult of dbResults) {
          if (!fontes.includes(dbResult.db)) {
            fontes.push(dbResult.db);
          }
          if (dbResult.tables) {
            for (const table of dbResult.tables) {
              evidences.push({
                type: "SQL",
                db: dbResult.db,
                table: table.table,
                rows: table.rows,
              });
            }
          } else if (dbResult.error) {
            evidences.push({
              type: "SQL",
              db: dbResult.db,
              error: dbResult.error,
            });
          }
        }
        fontes.forEach((f) => {
          citations.push(`sqlite:${f}`);
        });
      } catch (err) {
        console.error("[SQL] Erro ao buscar múltiplos DBs:", err);
      }
    }

    // ---------------- DOCS ----------------
    if (useDOCS) {
      const snippets = await searchDocs(state.question, 3);
      evidences.push({ type: "DOCS", snippets });
      citations.push("docs:local");
    }

    // ---------------- WEB ----------------
    if (useWEB) {
      const web = await searchInternet(state.question);
      evidences.push({ type: "WEB", web: web.text || "" });
      if (web.sources?.length) citations.push(...web.sources);
      else citations.push("internet");
    }

    return { ...state, evidences, citations };
  },
});

// Node de resposta final
const answerNode = new RunnableLambda({
  func: async (state) => {
    const context = JSON.stringify(state.evidences, null, 2);

    const res = await model.invoke([
      { role: "system", content: SYSTEM_ANSWERER },
      {
        role: "user",
        content: `Pergunta: ${state.question}\n\nEvidências:\n${context}\n\nResponda:`,
      },
    ]);

    const finalAnswer =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
        ? res.content.map((c) => c.text || c).join("")
        : "";

    return { ...state, finalAnswer };
  },
});

// --- Monta o grafo ---
export function buildAgentGraph() {
  const graph = new StateGraph(AgentStateSchema);

  graph
    .addNode("router", routeNode)
    .addNode("tools", toolNode)
    .addNode("answer", answerNode)
    .addEdge(START, "router")
    .addEdge("router", "tools")
    .addEdge("tools", "answer")
    .addEdge("answer", END);

  return graph.compile();
}
