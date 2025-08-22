/**
 * Teste de Busca Semântica de Documentos (DocsSearch)
 * Feito com IA
 * Este script testa o sistema de busca semântica em documentos usando embeddings.
 * Pode ser executado de duas formas:
 * 1. Sem argumentos: executa uma bateria de testes predefinidos
 * 2. Com argumento: executa uma consulta específica passada como parâmetro
 *
 * Exemplos de uso:
 * - npm run test:docs
 * - npx tsx test-docs-embed.ts "mão invisível"
 * - npx tsx test-docs-embed.ts "Adam Smith"
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { CONFIG } from "./src/AgentConfigs/config.ts";
import { initDocsSearch, searchDocs } from "./src/functions/docsSearch.ts";

/**
 * Garante que existe um documento de exemplo para teste
 * Cria um arquivo de teste se não existir
 *
 * @param sampleWord - Palavra-chave para incluir no documento de exemplo
 */
async function ensureSampleDoc(sampleWord: string): Promise<void> {
  const dir = CONFIG.data.docsDir;

  // Cria o diretório se não existir
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(chalk.gray(`Diretório criado: ${dir}`));
  }

  const samplePath = path.join(dir, "sample_test.txt");

  // Cria documento de exemplo se não existir
  if (!fs.existsSync(samplePath)) {
    const content = `Este é um documento de teste para o sistema de busca semântica.
Palavra-chave: ${sampleWord}.
Outros termos: economia, mercado, oferta, demanda.
Este documento contém informações sobre conceitos econômicos básicos.`;

    fs.writeFileSync(samplePath, content, "utf-8");
    console.log(chalk.gray(`📄 Documento de exemplo criado: ${samplePath}`));
  }
}

/**
 * Executa uma busca individual e exibe os resultados
 *
 * @param query - Consulta de busca
 * @param isSingleQuery - Se true, formata a saída para consulta única
 */
async function executeSearch(
  query: string,
  isSingleQuery: boolean = false
): Promise<void> {
  try {
    console.log(chalk.gray(`\nBuscando: "${query}"`));

    // Executa a busca com até 3 resultados
    const results = await searchDocs(query, 3);

    if (results.length === 0) {
      const message = isSingleQuery
        ? "Nenhum resultado relevante encontrado."
        : "Nenhum resultado relevante encontrado.";
      console.log(chalk.yellow(message));
    } else {
      const message = isSingleQuery
        ? `${results.length} resultado(s) encontrado(s):`
        : `${results.length} resultado(s):`;
      console.log(chalk.green(message));

      // Exibe cada resultado formatado
      results.forEach((result, index) => {
        const snippet = result.replace(/\s+/g, " ").slice(0, 200);
        const prefix = isSingleQuery ? "  " : "    ";
        console.log(
          chalk.white(
            `${prefix}${index + 1}. ${snippet}${
              result.length > 200 ? "..." : ""
            }`
          )
        );
      });
    }
  } catch (error) {
    const message = isSingleQuery ? "Erro na busca:" : "Erro na busca:";
    console.error(chalk.red(message), error);
  }
}

/**
 * Função principal do script de teste
 */
async function main(): Promise<void> {
  // Extrai argumentos da linha de comando
  const argQuery = process.argv.slice(2).join(" ").trim();

  // Exibe cabeçalho do teste
  console.log(
    chalk.cyan.bold("\nTestando Busca Semântica de Documentos (DocsSearch)\n")
  );

  // Informa o modo de execução
  if (argQuery) {
    console.log(chalk.white(`Consulta única: "${argQuery}"`));
  } else {
    console.log(
      chalk.white(
        "Sem consulta passada por argumento; rodando bateria de testes."
      )
    );
  }

  // Garante documento de exemplo apenas se não for consulta única
  if (!argQuery) {
    await ensureSampleDoc("mão invisível");
  }

  try {
    // Inicializa o sistema de busca de documentos
    console.log(chalk.gray("\nIndexando documentos (DocsSearch)..."));
    await initDocsSearch(false);
    console.log(chalk.green("Indexação concluída."));
  } catch (error) {
    console.error(chalk.red("Falha ao indexar documentos:"), error);
    process.exit(1);
  }

  // Executa busca baseada no tipo de execução
  if (argQuery) {
    // Modo consulta única
    await executeSearch(argQuery, true);
  } else {
    // Modo bateria de testes
    const testQueries = [
      "mão invisível",
      "Adam Smith",
      "overfitting",
      "gradiente descendente",
      "gastronomia italiana",
    ];

    console.log(chalk.cyan("\nExecutando bateria de testes..."));

    for (const query of testQueries) {
      await executeSearch(query, false);

      // Pausa entre consultas para evitar sobrecarga
      if (query !== testQueries[testQueries.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Exibe dicas de uso
  console.log(
    chalk.gray(
      "\nDicas de uso:\n" +
        "- Edite/adicione arquivos .txt em data/documents/ e rode novamente\n" +
        '- Passe uma consulta específica: npx tsx test-docs-embed.ts "termo no seu .txt"\n' +
        "- Use termos que existam nos seus documentos para melhores resultados\n"
    )
  );
}

// Executa o script principal com tratamento de erros
main().catch((error) => {
  console.error(chalk.red("Erro fatal no script:"), error);
  process.exit(1);
});
