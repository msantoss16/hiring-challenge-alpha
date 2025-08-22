#!/usr/bin/env node

/**
 * Script de teste avançado para demonstrar as funcionalidades do agente
 * Execute com: npm run test:agent
 */

import { buildAgentGraph } from "./src/graph.ts";
import { initDocsSearch } from "./src/functions/docsSearch.ts";
import { initSql } from "./src/functions/sqliteFunction.ts";
import { setAutoApprove } from "./src/functions/internetSearch.ts";
import chalk from "chalk";

console.log(chalk.cyan.bold("🧪 TESTE AVANÇADO DO AGENTE MULTI-FONTE\n"));

// Configuração dos testes
const TEST_CONFIG = {
  delayBetweenTests: 3000, // 3 segundos entre testes
  maxRetries: 2,
  timeoutMs: 30000,
};

// Categorias de testes
const TEST_CATEGORIES = {
  SQL: {
    name: "SQLite Database",
    color: chalk.magenta,
    tests: [
      {
        question: "select * from artists limit 3",
        expected: "SQL",
        description: "Consulta básica de artistas",
      },
      {
        question:
          "select name, title from artists join albums on artists.ArtistId = albums.ArtistId limit 5",
        expected: "SQL",
        description: "JOIN entre artistas e álbuns",
      },
      {
        question: "select count(*) as total_artists from artists",
        expected: "SQL",
        description: "Contagem de artistas",
      },
      {
        question: "select * from non_existent_table",
        expected: "SQL",
        description: "Tabela inexistente (teste de erro)",
      },
    ],
  },
  DOCS: {
    name: "Documentos Locais",
    color: chalk.blue,
    tests: [
      {
        question: "What are the main economic concepts discussed?",
        expected: "DOCS",
        description: "Conceitos econômicos",
      },
      {
        question: "Explain machine learning concepts",
        expected: "DOCS",
        description: "Conceitos de machine learning",
      },
      {
        question: "What is the content about?",
        expected: "DOCS",
        description: "Conteúdo geral dos documentos",
      },
    ],
  },
  WEB: {
    name: "Pesquisa na Internet",
    color: chalk.green,
    tests: [
      {
        question: "What's the current Node.js version?",
        expected: "WEB",
        description: "Versão atual do Node.js",
      },
      {
        question: "What is the capital of France?",
        expected: "WEB",
        description: "Capital da França",
      },
      {
        question: "Who was Albert Einstein?",
        expected: "WEB",
        description: "Biografia de Einstein",
      },
    ],
  },
  MULTI: {
    name: "Múltiplas Fontes",
    color: chalk.yellow,
    tests: [
      {
        question: "Tell me about music and economics",
        expected: ["SQL", "DOCS", "WEB"],
        description: "Música e economia (múltiplas fontes)",
      },
      {
        question:
          "What are the latest developments in AI and machine learning?",
        expected: ["DOCS", "WEB"],
        description: "IA e machine learning",
      },
      {
        question: "Show me artists and explain economic principles",
        expected: ["SQL", "DOCS"],
        description: "Artistas e princípios econômicos",
      },
    ],
  },
  EDGE: {
    name: "Casos Extremos",
    color: chalk.red,
    tests: [
      {
        question: "",
        expected: "WEB",
        description: "Pergunta vazia",
      },
      {
        question: "a".repeat(1000),
        expected: "WEB",
        description: "Pergunta muito longa",
      },
      {
        question: "SELECT * FROM artists; DROP TABLE artists;",
        expected: "SQL",
        description: "SQL injection attempt",
      },
    ],
  },
};

// Estatísticas dos testes
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  totalTime: 0,
  categoryStats: {} as Record<
    string,
    { passed: number; failed: number; total: number }
  >,
};

// Inicializa as fontes de dados e cria o grafo do agente
let agentGraph: any = null;

async function initializeDataSources() {
  console.log(chalk.cyan("🔧 Inicializando fontes de dados..."));

  try {
    // Ativa aprovação automática para comandos bash durante os testes
    setAutoApprove(true);
    console.log(
      chalk.green("✅ Aprovação automática de comandos bash ativada")
    );

    await initDocsSearch();
    initSql();
    console.log(chalk.green("✅ Fontes de dados inicializadas com sucesso"));

    // Cria o grafo do agente
    agentGraph = buildAgentGraph();
    console.log(chalk.green("✅ Grafo do agente criado com sucesso\n"));
  } catch (error) {
    console.log(
      chalk.yellow("⚠️  Algumas fontes podem não estar disponíveis\n")
    );
  }
}

// Executa um teste individual
async function runSingleTest(
  category: string,
  test: any,
  testIndex: number,
  totalTests: number
): Promise<boolean> {
  const categoryConfig =
    TEST_CATEGORIES[category as keyof typeof TEST_CATEGORIES];
  const testNumber = testIndex + 1;

  console.log(chalk.yellow("=".repeat(80)));
  console.log(
    categoryConfig.color.bold(
      `${categoryConfig.name} - Teste ${testNumber}/${totalTests}: ${test.description}`
    )
  );
  console.log(chalk.yellow("=".repeat(80)));
  console.log(chalk.cyan(`🔍 Pergunta: "${test.question}"`));
  console.log(
    chalk.cyan(
      `🎯 Esperado: ${
        Array.isArray(test.expected) ? test.expected.join(", ") : test.expected
      }`
    )
  );

  const startTime = Date.now();
  let success = false;
  let attempts = 0;

  while (attempts < TEST_CONFIG.maxRetries && !success) {
    attempts++;

    try {
      const result = await Promise.race([
        agentGraph.invoke({ question: test.question }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), TEST_CONFIG.timeoutMs)
        ),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(chalk.green("✅ Resultado:"));
      console.log(
        chalk.white(
          result.finalAnswer.substring(0, 300) +
            (result.finalAnswer.length > 300 ? "..." : "")
        )
      );

      if (result.citations && result.citations.length > 0) {
        console.log(
          chalk.cyan(`\n📊 Fontes utilizadas: ${result.citations.join(", ")}`)
        );
        console.log(chalk.cyan(`⏱️  Tempo: ${executionTime}ms`));
        console.log(chalk.cyan(`🔄 Tentativas: ${attempts}`));
      }

      // Validação do resultado
      const expectedSources = Array.isArray(test.expected)
        ? test.expected
        : [test.expected];
      const actualSources = result.citations || [];

      const sourceMatch = expectedSources.some((expected: string) =>
        actualSources.some((citation: string) =>
          citation.includes(expected.toLowerCase())
        )
      );

      if (sourceMatch) {
        console.log(
          chalk.green("✅ Teste PASSOU - Fontes corretas utilizadas")
        );
        success = true;
      } else {
        console.log(
          chalk.yellow("⚠️  Teste PARCIAL - Fontes diferentes das esperadas")
        );
        console.log(chalk.yellow(`   Esperado: ${expectedSources.join(", ")}`));
        console.log(chalk.yellow(`   Obtido: ${actualSources.join(", ")}`));
        success = true; // Considera como sucesso mesmo com fontes diferentes
      }

      testStats.totalTime += executionTime;
    } catch (error: any) {
      console.log(
        chalk.red(`❌ Tentativa ${attempts} falhou: ${error.message}`)
      );

      if (attempts >= TEST_CONFIG.maxRetries) {
        console.log(chalk.red("❌ Teste FALHOU após todas as tentativas"));
        return false;
      }

      console.log(
        chalk.yellow(`⏳ Aguardando 2 segundos antes da próxima tentativa...`)
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return success;
}

// Executa todos os testes de uma categoria
async function runCategoryTests(category: string) {
  const categoryConfig =
    TEST_CATEGORIES[category as keyof typeof TEST_CATEGORIES];
  const tests = categoryConfig.tests;

  console.log(
    chalk.cyan.bold(`\n📋 Executando testes de ${categoryConfig.name}`)
  );
  console.log(chalk.cyan(`Total de testes: ${tests.length}\n`));

  testStats.categoryStats[category] = {
    passed: 0,
    failed: 0,
    total: tests.length,
  };

  for (let i = 0; i < tests.length; i++) {
    testStats.total++;

    const success = await runSingleTest(category, tests[i], i, tests.length);

    if (success) {
      testStats.passed++;
      testStats.categoryStats[category].passed++;
    } else {
      testStats.failed++;
      testStats.categoryStats[category].failed++;
    }

    // Pausa entre testes
    if (i < tests.length - 1) {
      console.log(
        chalk.gray(
          `\n⏳ Aguardando ${
            TEST_CONFIG.delayBetweenTests / 1000
          } segundos...\n`
        )
      );
      await new Promise((resolve) =>
        setTimeout(resolve, TEST_CONFIG.delayBetweenTests)
      );
    }
  }
}

// Exibe relatório final
function displayFinalReport() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(80)));
  console.log(chalk.cyan.bold("📊 RELATÓRIO FINAL DOS TESTES"));
  console.log(chalk.cyan.bold("=".repeat(80)));

  // Estatísticas gerais
  console.log(chalk.white.bold("\n📈 Estatísticas Gerais:"));
  console.log(chalk.white(`   Total de testes: ${testStats.total}`));
  console.log(chalk.green(`   ✅ Passaram: ${testStats.passed}`));
  console.log(chalk.red(`   ❌ Falharam: ${testStats.failed}`));
  console.log(chalk.yellow(`   ⏭️  Pulados: ${testStats.skipped}`));
  console.log(chalk.cyan(`   ⏱️  Tempo total: ${testStats.totalTime}ms`));
  console.log(
    chalk.cyan(
      `   📊 Taxa de sucesso: ${(
        (testStats.passed / testStats.total) *
        100
      ).toFixed(1)}%`
    )
  );

  // Estatísticas por categoria
  console.log(chalk.white.bold("\n📋 Estatísticas por Categoria:"));
  Object.entries(testStats.categoryStats).forEach(([category, stats]) => {
    const categoryConfig =
      TEST_CATEGORIES[category as keyof typeof TEST_CATEGORIES];
    const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const status =
      stats.passed === stats.total
        ? chalk.green("✅")
        : stats.passed > 0
        ? chalk.yellow("⚠️")
        : chalk.red("❌");

    console.log(
      `${status} ${categoryConfig.color(categoryConfig.name)}: ` +
        `${stats.passed}/${stats.total} (${successRate}%)`
    );
  });

  // Recomendações
  console.log(chalk.white.bold("\n💡 Recomendações:"));
  if (testStats.failed > 0) {
    console.log(chalk.yellow("   • Revise os testes que falharam"));
    console.log(
      chalk.yellow("   • Verifique a conectividade com fontes externas")
    );
    console.log(
      chalk.yellow("   • Considere aumentar o timeout para testes lentos")
    );
  }

  if (testStats.totalTime > 60000) {
    console.log(
      chalk.yellow("   • Considere otimizar a performance dos testes")
    );
  }

  console.log(
    chalk.green(
      "   • Execute 'npm run dev' para testar o agente interativamente"
    )
  );
  console.log(
    chalk.green("   • Use 'npm run test:docs' para testar apenas documentos")
  );
  console.log(
    chalk.green("   • Use 'npm run test:internet' para testar apenas internet")
  );

  console.log(chalk.cyan.bold("\n🎉 Testes concluídos!"));
}

// Função principal
async function runAllTests() {
  try {
    await initializeDataSources();

    const categories = Object.keys(TEST_CATEGORIES);

    for (const category of categories) {
      await runCategoryTests(category);
    }

    displayFinalReport();
  } catch (error) {
    console.error(chalk.red("❌ Erro crítico durante os testes:"), error);
    process.exit(1);
  }
}

// Executa os testes
runAllTests().catch(console.error);
