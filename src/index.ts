import readline from "readline";
import chalk from "chalk";
import { CONFIG } from "./AgentConfigs/config.ts";
import { initDocsSearch } from "./functions/docsSearch.ts";
import { buildAgentGraph } from "./graph.ts";
import { initSql } from "./functions/sqliteFunction.ts";

// 🔹 Inicializa embeddings e banco SQLite
(async () => {
  try {
    await initDocsSearch(); // indexa documentos
    console.log(chalk.green("Documentos indexados com sucesso!"));
  } catch (err) {
    console.error(chalk.red("Erro ao indexar documentos:"), err);
  }

  try {
    initSql(); // conecta ao banco via better-sqlite3
    console.log(chalk.green("Banco SQLite inicializado com sucesso!"));
  } catch (err) {
    console.error(chalk.red("Erro ao inicializar banco SQLite:"), err);
  }

  // Cria o grafo do agente
  const agentGraph = buildAgentGraph();

  // Abre CLI interativo
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.cyan("\nDigite sua pergunta (ou 'sair' para encerrar):"));

  rl.on("line", async (input) => {
    const question = input.trim();
    if (question.toLowerCase() === "sair") {
      rl.close();
      return;
    }

    console.log(chalk.blue("Pergunta recebida:"), question);

    try {
      // Invoca o grafo do agente
      const result = await agentGraph.invoke({ question });

      // Exibe informações de fontes utilizadas
      if (result.citations && result.citations.length > 0) {
        console.log(
          chalk.yellow(`Fontes utilizadas: ${result.citations.join(", ")}`)
        );
      }

      console.log(
        "\n" + chalk.green(result.finalAnswer || "Não consegui gerar resposta.")
      );
    } catch (error: any) {
      console.error(chalk.red("Erro na execução do agente:"), error);
    }

    console.log(chalk.cyan("\nPergunte outra coisa ou digite 'sair'..."));
  });
})();
