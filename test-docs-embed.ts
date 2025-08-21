import fs from "fs";
import path from "path";
import chalk from "chalk";
import { CONFIG } from "./src/AgentConfigs/config.ts";
import { initDocsSearch, searchDocs } from "./src/functions/docsSearch.ts";

/*
    Teste de embeddings, feito com IA
    rode npm run test:docs
    ou npx tsx test-docs-embed.ts "sua consulta"
*/

// Função que gera um arquivo teste caso não haja nenhum
async function ensureSampleDoc(sampleWord: string) {
  const dir = CONFIG.data.docsDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const samplePath = path.join(dir, "sample_test.txt");
  if (!fs.existsSync(samplePath)) {
    const content = `Este é um documento de teste para o sistema de busca semântica.\nPalavra-chave: ${sampleWord}.\nOutros termos: economia, mercado, oferta, demanda.`;
    fs.writeFileSync(samplePath, content, "utf-8");
    console.log(chalk.gray(`Criado documento de exemplo: ${samplePath}`));
  }
}

async function main() {
  const argQuery = process.argv.slice(2).join(" ").trim();
  console.log(
    chalk.cyan.bold(
      "\n🧪 Testando Busca Semântica de Documentos (DocsSearch)\n"
    )
  );
  if (argQuery) {
    console.log(chalk.white(`Consulta única: ${argQuery}`));
  } else {
    console.log(
      chalk.white(
        "Sem consulta passada por argumento; rodando bateria de testes."
      )
    );
  }

  if (!argQuery) {
    await ensureSampleDoc("mão invisível");
  }

  try {
    console.log(chalk.gray("\n📥 Indexando documentos (DocsSearch)..."));
    await initDocsSearch(false);
    console.log(chalk.green("✅ Indexação concluída."));
  } catch (e) {
    console.error(chalk.red("❌ Falha ao indexar documentos:"), e);
    process.exit(1);
  }
  if (argQuery) {
    try {
      console.log(chalk.gray(`\n🔎 Buscando: ${argQuery}`));
      const results = await searchDocs(argQuery, 3);
      if (results.length === 0) {
        console.log(chalk.yellow("⚠️  Nenhum resultado relevante encontrado."));
      } else {
        console.log(
          chalk.green(`✅ ${results.length} resultado(s) encontrado(s):`)
        );
        results.forEach((r, i) => {
          const snippet = r.replace(/\s+/g, " ").slice(0, 200);
          console.log(
            chalk.white(`  ${i + 1}. ${snippet}${r.length > 200 ? "..." : ""}`)
          );
        });
      }
    } catch (e) {
      console.error(chalk.red("❌ Erro na busca:"), e);
    }
  } else {
    const testQueries = [
      "mão invisível",
      "Adam Smith",
      "overfitting",
      "gradiente descendente",
      "gastronomia italiana",
    ];

    for (const q of testQueries) {
      try {
        console.log(chalk.gray(`\n🔎 Buscando: ${q}`));
        const results = await searchDocs(q, 3);
        if (results.length === 0) {
          console.log(
            chalk.yellow("  ⚠️  Nenhum resultado relevante encontrado.")
          );
        } else {
          console.log(chalk.green(`  ✅ ${results.length} resultado(s):`));
          results.forEach((r, i) => {
            const snippet = r.replace(/\s+/g, " ").slice(0, 200);
            console.log(
              chalk.white(
                `    ${i + 1}. ${snippet}${r.length > 200 ? "..." : ""}`
              )
            );
          });
        }
      } catch (e) {
        console.error(chalk.red("  ❌ Erro na busca:"), e);
      }
    }
  }

  //   try {
  //     console.log(chalk.gray("\n🔎 Buscando com embeddings..."));
  //     const results = await searchWithEmbeddings(`eu amo meu gato o que faço`, 3);

  //     if (results.length === 0) {
  //       console.log(
  //         chalk.yellow(
  //           "⚠️  Nenhum resultado relevante encontrado pelos embeddings."
  //         )
  //       );
  //     } else {
  //       console.log(
  //         chalk.green(`✅ ${results.length} resultado(s) encontrado(s):`)
  //       );
  //       results.forEach((r, i) => {
  //         const snippet = r.replace(/\s+/g, " ").slice(0, 200);
  //         console.log(
  //           chalk.white(`  ${i + 1}. ${snippet}${r.length > 200 ? "..." : ""}`)
  //         );
  //       });
  //     }
  //   } catch (e) {
  //     console.error(chalk.red("❌ Erro na busca por embeddings:"), e);
  //   }

  console.log(
    chalk.gray(
      '\nDicas:\n- Edite/adicione .txt em data/documents/ e rode novamente.\n- Passe uma consulta específica: npx tsx test-docs-embed.ts "termo no seu .txt"\n'
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
