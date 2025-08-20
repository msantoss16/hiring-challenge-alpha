import OpenAI from "openai";
import readline from "readline";
import chalk from "chalk"; // 🔹 Importa o chalk
import { CONFIG } from "./config.ts";
import { querySQLite } from "./functions/sqliteFunction.ts";
import { embedDocuments, searchWithEmbeddings } from "./functions/docsEmbed.ts";

const client = new OpenAI({ apiKey: CONFIG.openaiApiKey });

// 🔹 Função principal do agente
export async function runAgent(question: string) {
  console.log(chalk.blue("Pergunta recebida:"), question);

  // 1️⃣ SQL
  if (question.trim().toLowerCase().startsWith("select")) {
    const result = await querySQLite(question);
    if (result && result.length > 0) {
      console.log(chalk.yellow("Fonte usada: SQLite"));
      return chalk.green(
        `Resultado da consulta SQL:\n${JSON.stringify(result, null, 2)}`
      );
    }
    console.log(
      chalk.yellow("SQL não retornou resultados, tentando embeddings...")
    );
  }

  // 2️⃣ Documentos com embeddings com score para garantir q é util
  const docResults = await searchWithEmbeddings(question, 2, 0.7);
  if (docResults.length > 0) {
    console.log(chalk.yellow("Fonte usada: Embeddings"));
    return chalk.green(
      `Encontrei nos documentos:\n\n${docResults.join("\n---\n")}`
    );
  }

  // 3️⃣ Se nada encontrado → usa LLM direto
  console.log(
    chalk.yellow("Nenhum documento encontrado, usando LLM diretamente...")
  );
  const response = await client.chat.completions.create({
    model: CONFIG.modelName,
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente inteligente que responde com base em documentos, banco de dados ou conhecimento geral.",
      },
      { role: "user", content: question },
    ],
  });

  console.log(chalk.yellow("Fonte usada: LLM"));
  return chalk.green(
    response.choices[0]?.message?.content ?? "Não consegui gerar resposta."
  );
}

// 🔹 Inicializa embeddings e abre CLI interativo
(async () => {
  try {
    await embedDocuments();
    console.log(chalk.green("Documentos indexados com sucesso!"));
  } catch (err) {
    console.error(chalk.red("Erro ao indexar documentos:"), err);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.cyan("\nDigite sua pergunta (ou 'sair' para encerrar):"));

  rl.on("line", async (input) => {
    if (input.trim().toLowerCase() === "sair") {
      rl.close();
      return;
    }

    const resposta = await runAgent(input);
    console.log("\n" + resposta);
    console.log(chalk.cyan("\nPergunte outra coisa ou digite 'sair'..."));
  });
})();
