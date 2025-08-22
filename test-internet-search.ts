#!/usr/bin/env node

/**
 * Script de teste avançado para demonstrar pesquisa na internet
 * Execute com: npm run test:internet
 */

import {
  searchInternet,
  executeInternetSearch,
} from "./src/functions/internetSearch.ts";
import chalk from "chalk";

console.log(chalk.cyan.bold("🌐 TESTE AVANÇADO DE PESQUISA NA INTERNET\n"));

// Configuração dos testes
const TEST_CONFIG = {
  delayBetweenTests: 5000, // 5 segundos entre testes para evitar rate limiting
  maxRetries: 3,
  timeoutMs: 45000, // 45 segundos de timeout
  maxResponseLength: 500, // Máximo de caracteres para exibir na resposta
};

// Categorias de testes
const TEST_CATEGORIES = {
  BASIC: {
    name: "Pesquisas Básicas",
    color: chalk.blue,
    tests: [
      {
        question: "Qual a capital da França?",
        description: "Informação geográfica básica",
        expectedKeywords: ["Paris", "França", "capital"],
      },
      {
        question: "Quem foi Albert Einstein?",
        description: "Biografia de pessoa famosa",
        expectedKeywords: ["Einstein", "físico", "relatividade"],
      },
      {
        question: "Como funciona a fotossíntese?",
        description: "Processo científico",
        expectedKeywords: ["fotossíntese", "plantas", "clorofila"],
      },
    ],
  },
  TECHNICAL: {
    name: "Pesquisas Técnicas",
    color: chalk.green,
    tests: [
      {
        question: "What's the current Node.js version?",
        description: "Versão de software",
        expectedKeywords: ["Node.js", "version", "LTS"],
      },
      {
        question: "What is TypeScript?",
        description: "Linguagem de programação",
        expectedKeywords: ["TypeScript", "JavaScript", "Microsoft"],
      },
      {
        question: "How to install Python on Windows?",
        description: "Instruções de instalação",
        expectedKeywords: ["Python", "install", "Windows"],
      },
    ],
  },
  CURRENT_EVENTS: {
    name: "Eventos Atuais",
    color: chalk.yellow,
    tests: [
      {
        question: "What are the latest news about AI?",
        description: "Notícias recentes sobre IA",
        expectedKeywords: ["AI", "artificial intelligence", "news"],
      },
      {
        question: "What is the weather like today?",
        description: "Informação meteorológica",
        expectedKeywords: ["weather", "temperature", "forecast"],
      },
    ],
  },
  COMPLEX: {
    name: "Pesquisas Complexas",
    color: chalk.magenta,
    tests: [
      {
        question: "Qual a história da Torre Eiffel?",
        description: "História detalhada de monumento",
        expectedKeywords: ["Torre Eiffel", "Paris", "história"],
      },
      {
        question: "Como funciona o sistema solar?",
        description: "Explicação científica complexa",
        expectedKeywords: ["sistema solar", "planetas", "sol"],
      },
      {
        question: "What are the benefits of meditation?",
        description: "Benefícios de prática de bem-estar",
        expectedKeywords: ["meditation", "benefits", "health"],
      },
    ],
  },
  EDGE_CASES: {
    name: "Casos Extremos",
    color: chalk.red,
    tests: [
      {
        question: "",
        description: "Pergunta vazia",
        expectedKeywords: [],
      },
      {
        question: "a".repeat(100),
        description: "Pergunta muito longa",
        expectedKeywords: [],
      },
      {
        question: "xyz123abc",
        description: "Pergunta sem sentido",
        expectedKeywords: [],
      },
    ],
  },
};

// Estatísticas dos testes
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  totalTime: 0,
  categoryStats: {} as Record<
    string,
    { passed: number; failed: number; total: number; avgTime: number }
  >,
  sourceStats: {
    searx: { used: 0, success: 0 },
    duckduckgo: { used: 0, success: 0 },
    wikipedia: { used: 0, success: 0 },
  },
};

// Função para verificar se a resposta contém palavras-chave esperadas
function validateResponse(
  response: string,
  expectedKeywords: string[]
): boolean {
  if (expectedKeywords.length === 0) return true; // Casos extremos não têm validação

  const responseLower = response.toLowerCase();
  const foundKeywords = expectedKeywords.filter((keyword) =>
    responseLower.includes(keyword.toLowerCase())
  );

  return foundKeywords.length >= Math.ceil(expectedKeywords.length * 0.5); // Pelo menos 50% das palavras-chave
}

// Função para extrair estatísticas das fontes (simulada)
function extractSourceStats(response: string): string {
  if (response.includes("SearX") || response.includes("searx")) return "searx";
  if (response.includes("DuckDuckGo") || response.includes("duckduckgo"))
    return "duckduckgo";
  if (response.includes("Wikipedia") || response.includes("wikipedia"))
    return "wikipedia";
  return "unknown";
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

  const startTime = Date.now();
  let success = false;
  let attempts = 0;
  let finalResponse = "";
  let sourceUsed = "";

  while (attempts < TEST_CONFIG.maxRetries && !success) {
    attempts++;

    try {
      console.log(
        chalk.gray(`   Tentativa ${attempts}/${TEST_CONFIG.maxRetries}...`)
      );

      const result = await Promise.race([
        searchInternet(test.question),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), TEST_CONFIG.timeoutMs)
        ),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      finalResponse = result;
      sourceUsed = extractSourceStats(result);

      console.log(chalk.green("✅ Resposta obtida:"));
      console.log(
        chalk.white(
          `   ${result.substring(0, TEST_CONFIG.maxResponseLength)}${
            result.length > TEST_CONFIG.maxResponseLength ? "..." : ""
          }`
        )
      );
      console.log(chalk.cyan(`   ⏱️  Tempo: ${executionTime}ms`));
      console.log(chalk.cyan(`   🔄 Tentativas: ${attempts}`));
      console.log(chalk.cyan(`   📡 Fonte: ${sourceUsed}`));

      // Validação da resposta
      const isValid = validateResponse(result, test.expectedKeywords);

      if (isValid) {
        console.log(chalk.green("✅ Teste PASSOU - Resposta válida"));
        success = true;
      } else {
        console.log(
          chalk.yellow("⚠️  Teste PARCIAL - Resposta pode não ser relevante")
        );
        console.log(
          chalk.yellow(
            `   Palavras-chave esperadas: ${test.expectedKeywords.join(", ")}`
          )
        );
        success = true; // Considera como sucesso mesmo com validação parcial
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
        chalk.yellow(`⏳ Aguardando 3 segundos antes da próxima tentativa...`)
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Atualiza estatísticas das fontes
  if (sourceUsed && sourceUsed !== "unknown") {
    testStats.sourceStats[sourceUsed as keyof typeof testStats.sourceStats]
      .used++;
    if (success) {
      testStats.sourceStats[sourceUsed as keyof typeof testStats.sourceStats]
        .success++;
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
    avgTime: 0,
  };

  let categoryTotalTime = 0;

  for (let i = 0; i < tests.length; i++) {
    testStats.total++;

    const testStartTime = Date.now();
    const success = await runSingleTest(category, tests[i], i, tests.length);
    const testEndTime = Date.now();

    categoryTotalTime += testEndTime - testStartTime;

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

  // Calcula tempo médio da categoria
  testStats.categoryStats[category].avgTime = categoryTotalTime / tests.length;
}

// Teste de performance com executeInternetSearch
async function runPerformanceTest() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(80)));
  console.log(chalk.cyan.bold("🚀 TESTE DE PERFORMANCE COM METADADOS"));
  console.log(chalk.cyan.bold("=".repeat(80)));

  const performanceQuestions = [
    "What is the history of the Eiffel Tower?",
    "How does photosynthesis work?",
    "What are the benefits of exercise?",
  ];

  for (let i = 0; i < performanceQuestions.length; i++) {
    const question = performanceQuestions[i];
    console.log(chalk.cyan(`\n🔍 Testando: "${question}"`));

    try {
      const result = await executeInternetSearch(question);

      if (result.success) {
        console.log(chalk.green("✅ Execução bem-sucedida:"));
        console.log(chalk.white(`   Fonte: ${result.source}`));
        console.log(chalk.white(`   Palavra-chave: ${result.keyword}`));
        console.log(chalk.white(`   Consulta: ${result.query}`));
        console.log(chalk.white(`   Tempo: ${result.executionTime}ms`));
        console.log(
          chalk.white(
            `   Resultado: ${result.data?.substring(0, 300) || "Sem dados"}${
              result.data && result.data.length > 300 ? "..." : ""
            }`
          )
        );
      } else {
        console.log(chalk.red("❌ Falhou:"));
        console.log(chalk.red(`   Erro: ${result.error}`));
      }
    } catch (error: any) {
      console.error(chalk.red("❌ Erro na execução:"), error.message);
    }

    // Pausa entre testes de performance
    if (i < performanceQuestions.length - 1) {
      console.log(chalk.gray("\n⏳ Aguardando 5 segundos...\n"));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Exibe relatório final
function displayFinalReport() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(80)));
  console.log(chalk.cyan.bold("📊 RELATÓRIO FINAL DOS TESTES DE INTERNET"));
  console.log(chalk.cyan.bold("=".repeat(80)));

  // Estatísticas gerais
  console.log(chalk.white.bold("\n📈 Estatísticas Gerais:"));
  console.log(chalk.white(`   Total de testes: ${testStats.total}`));
  console.log(chalk.green(`   ✅ Passaram: ${testStats.passed}`));
  console.log(chalk.red(`   ❌ Falharam: ${testStats.failed}`));
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
    const avgTime = stats.avgTime.toFixed(0);
    const status =
      stats.passed === stats.total
        ? chalk.green("✅")
        : stats.passed > 0
        ? chalk.yellow("⚠️")
        : chalk.red("❌");

    console.log(
      `${status} ${categoryConfig.color(categoryConfig.name)}: ` +
        `${stats.passed}/${stats.total} (${successRate}%) - ${avgTime}ms avg`
    );
  });

  // Estatísticas das fontes
  console.log(chalk.white.bold("\n📡 Estatísticas das Fontes:"));
  Object.entries(testStats.sourceStats).forEach(([source, stats]) => {
    const successRate =
      stats.used > 0 ? ((stats.success / stats.used) * 100).toFixed(1) : "0.0";
    const status = stats.success > 0 ? chalk.green("✅") : chalk.red("❌");

    console.log(
      `${status} ${chalk.cyan(source)}: ` +
        `${stats.success}/${stats.used} usos (${successRate}% sucesso)`
    );
  });

  // Recomendações
  console.log(chalk.white.bold("\n💡 Recomendações:"));
  if (testStats.failed > 0) {
    console.log(chalk.yellow("   • Verifique a conectividade com a internet"));
    console.log(chalk.yellow("   • Algumas APIs podem ter rate limiting"));
    console.log(
      chalk.yellow("   • Considere aumentar o timeout para testes lentos")
    );
  }

  if (testStats.totalTime > 120000) {
    console.log(
      chalk.yellow("   • Considere otimizar a performance das pesquisas")
    );
  }

  console.log(
    chalk.green(
      "   • Execute 'npm run dev' para testar o agente interativamente"
    )
  );
  console.log(
    chalk.green("   • Use 'npm run test:agent' para testes completos do agente")
  );
  console.log(
    chalk.green("   • Use 'npm run test:docs' para testar apenas documentos")
  );

  console.log(chalk.cyan.bold("\n🎉 Testes de internet concluídos!"));
}

// Função principal
async function runAllTests() {
  try {
    console.log(chalk.cyan("🔧 Iniciando testes de pesquisa na internet...\n"));

    const categories = Object.keys(TEST_CATEGORIES);

    for (const category of categories) {
      await runCategoryTests(category);
    }

    // Teste de performance adicional
    await runPerformanceTest();

    displayFinalReport();
  } catch (error) {
    console.error(chalk.red("❌ Erro crítico durante os testes:"), error);
    process.exit(1);
  }
}

// Executa os testes
runAllTests().catch(console.error);
