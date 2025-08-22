import readline from "readline";
import chalk from "chalk";
import { buildAgentGraph } from "./graph.js";
import { initDocsSearch } from "./functions/docsSearch.js";
import { initSql } from "./functions/sqliteFunction.js";
import { resetUserApproval, setReadline } from "./functions/internetSearch.js";

// 🔹 Inicializa embeddings e banco SQLite
(async () => {
  resetUserApproval();

  try {
    await initDocsSearch();
    console.log(chalk.green("Documentos indexados com sucesso!"));
  } catch (err) {
    console.error(chalk.red("Erro ao indexar documentos:"), err);
  }

  try {
    initSql();
    console.log(chalk.green("Banco SQLite inicializado com sucesso!"));
  } catch (err) {
    console.error(chalk.red("Erro ao inicializar banco SQLite:"), err);
  }

  const agentGraph = buildAgentGraph();

  // Criar readline principal e compartilhar
  const rlMain = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("\nDigite sua pergunta (ou 'sair' para encerrar): "),
  });
  setReadline(rlMain); // passa a interface para approvals
  rlMain.prompt();

  rlMain.on("line", async (input) => {
    const question = input.trim();
    if (question.toLowerCase() === "sair") {
      rlMain.close();
      return;
    }

    console.log(chalk.blue("Pergunta recebida:"), question);

    try {
      const result = await agentGraph.invoke({ question });
      if (result.citations && result.citations.length > 0) {
        console.log(
          chalk.yellow(`Fontes utilizadas: ${result.citations.join(", ")}`)
        );
      }
      console.log(
        "\n" + chalk.green(result.finalAnswer || "Não consegui gerar resposta.")
      );
    } catch (err: any) {
      console.error(chalk.red("Erro na execução do agente:"), err);
    }

    rlMain.prompt();
  });

  rlMain.on("close", () => {
    console.log(chalk.cyan("\nEncerrando a CLI. Até mais!"));
    process.exit(0);
  });
})();
