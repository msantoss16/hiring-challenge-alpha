import { exec } from "child_process";
import nlp from "compromise";
import readline from "readline";
import chalk from "chalk";

// Flags para controle de aprovação
let autoApprove = false;
let userApproved = false; // Flag para aprovação única por sessão

/**
 * Define se comandos bash devem ser aprovados automaticamente
 * @param approve true para aprovação automática, false para solicitar aprovação
 */
export function setAutoApprove(approve: boolean): void {
  autoApprove = approve;
}

/**
 * Reseta a aprovação do usuário (útil para nova sessão)
 */
export function resetUserApproval(): void {
  userApproved = false;
}

/**
 * Solicita aprovação do usuário para executar comandos bash
 * @param command Comando a ser executado (apenas para exibição)
 * @returns Promise<boolean> true se aprovado, false se rejeitado
 */
async function requestUserApproval(command: string): Promise<boolean> {
  // Se aprovação automática estiver ativada, aprova automaticamente
  if (autoApprove) {
    console.log(
      chalk.green("✅ Comando aprovado automaticamente (modo teste).")
    );
    return true;
  }

  // Se o usuário já aprovou nesta sessão, aprova automaticamente
  if (userApproved) {
    console.log(
      chalk.green("✅ Comando aprovado (aprovado anteriormente nesta sessão).")
    );
    return true;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.yellow("\n🔒 COMANDO BASH DETECTADO"));
    console.log(chalk.yellow("=".repeat(50)));
    console.log(chalk.cyan(`Comando: ${command}`));
    console.log(chalk.yellow("=".repeat(50)));
    console.log(
      chalk.white(
        "Este comando será executado para buscar informações na internet."
      )
    );
    console.log(
      chalk.white("Deseja aprovar a execução para esta sessão? (s/n): ")
    );
    console.log(
      chalk.gray("(Aprovação será mantida para comandos futuros nesta sessão)")
    );

    rl.question("", (answer) => {
      rl.close();
      const approved =
        answer.toLowerCase().startsWith("s") ||
        answer.toLowerCase().startsWith("y");

      if (approved) {
        userApproved = true; // Marca como aprovado para toda a sessão
        console.log(
          chalk.green("✅ Aprovação concedida para esta sessão. Executando...")
        );
      } else {
        console.log(chalk.red("❌ Comando rejeitado pelo usuário."));
      }

      resolve(approved);
    });
  });
}

/**
 * Executa um comando bash com aprovação do usuário
 * @param command Comando a ser executado
 * @returns Promise<string> Resultado do comando ou string vazia se rejeitado
 */
async function executeWithApproval(command: string): Promise<string> {
  const approved = await requestUserApproval(command);

  if (!approved) {
    return "";
  }

  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      if (error) {
        console.log(chalk.red(`❌ Erro ao executar comando: ${error.message}`));
        resolve("");
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Faz uma busca na internet usando múltiplas fontes
 * @param question Pergunta do usuário
 */
export async function searchInternet(question: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Primeiro tenta SearX (meta-motor de busca) unico que permitiu fazer requests com perguntas inteiras, https://www.reddit.com/r/Searx/comments/1g3egc4/public_searxng_instance_that_supports_json/
      const searxResult = await searchSearX(question);
      if (searxResult && searxResult.trim() !== "") {
        return resolve(searxResult);
      }

      // Se SearX falhar, tenta DuckDuckGo (aceita apenas palavras diretas)
      const duckDuckGoResult = await searchDuckDuckGo(question);
      if (duckDuckGoResult && duckDuckGoResult.trim() !== "") {
        return resolve(duckDuckGoResult);
      }

      // Se DuckDuckGo falhar, tenta Wikipedia (aceita palavras diretas)
      const wikipediaResult = await searchWikipedia(question);
      if (wikipediaResult && wikipediaResult.trim() !== "") {
        return resolve(wikipediaResult);
      }

      // Se todas falharem, retorna mensagem padrão
      resolve(
        "Não encontrei informações relevantes na internet. Tente reformular sua pergunta."
      );
    } catch (error) {
      reject(`Erro na pesquisa: ${error}`);
    }
  });
}

/**
 * Busca usando SearX
 */
async function searchSearX(question: string): Promise<string> {
  const keyword = extractMainKeyword(question);
  const query = encodeURIComponent(question); // Usa a pergunta completa para melhor contexto
  const url = `https://searx.perennialte.ch/search?q=${query}&format=json`;
  const command = `curl -s "${url}"`;

  console.log(
    `Buscando no SearX especificamente por: "${question}" (pergunta: "${question}")`
  );

  const stdout = await executeWithApproval(command);

  if (!stdout) {
    return "";
  }

  try {
    const data = JSON.parse(stdout);
    console.log(data);

    // SearX retorna resultados em diferentes formatos
    if (data.results && data.results.length > 0) {
      // Pega o primeiro resultado mais relevante
      const firstResult = data.results[0];
      let result = "";

      if (firstResult.content) {
        result = firstResult.content;
      } else if (firstResult.snippet) {
        result = firstResult.snippet;
      } else if (firstResult.description) {
        result = firstResult.description;
      }

      if (result && result.trim() !== "") {
        console.log(result);
        return result;
      }
    }

    // Se não conseguiu extrair resultado, tenta DuckDuckGo
    return "";
  } catch (err) {
    return "";
  }
}

/**
 * Busca usando DuckDuckGo API
 */
async function searchDuckDuckGo(question: string): Promise<string> {
  const keyword = extractMainKeyword(question);
  const query = encodeURIComponent(keyword.join(" ")); //nao aceita perguntas, pega a palavra principal
  const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1&no_html=1`;
  const command = `curl -s "${url}"`;

  console.log(`SearX falhou, Buscando no DuckDuckGo por: "${keyword}"`);

  const stdout = await executeWithApproval(command);

  if (!stdout) {
    return "";
  }

  try {
    const data = JSON.parse(stdout);
    if (data.AbstractText) {
      return data.AbstractText;
    } else if (data.RelatedTopics?.length > 0) {
      return data.RelatedTopics[0].Text || "";
    } else {
      return "";
    }
  } catch (err) {
    return "";
  }
}

/**
 * Busca usando Wikipedia API
 */
async function searchWikipedia(question: string): Promise<string> {
  const keyword = extractMainKeyword(question); //Por ser curl, to usando a api que aceita palavras-chaves diretas
  const query = encodeURIComponent(keyword.join(" "));
  const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${query}`;
  const command = `curl -s "${url}"`;

  console.log(`DuckDuckgo falhou, Buscando na Wikipedia por: "${keyword}"`);

  const stdout = await executeWithApproval(command);

  if (!stdout) {
    return "";
  }

  try {
    const data = JSON.parse(stdout);
    if (data.extract) {
      return data.extract;
    } else {
      return "";
    }
  } catch (err) {
    return "";
  }
}

/**
 * Extrai a palavra-chave principal da pergunta --> script pego do stackoverflow
 */
function extractMainKeyword(question: string): string[] {
  const doc = nlp(question);

  // Extrai substantivos e substantivos próprios
  const nouns = doc.nouns().out("array");

  // Se não houver substantivos, retorna todas as palavras não stopwords
  if (nouns.length === 0) {
    const stopwords = [
      "qual",
      "a",
      "o",
      "os",
      "as",
      "de",
      "do",
      "da",
      "em",
      "um",
      "uma",
      "para",
      "é",
      "foi",
      "que",
      "com",
      "como",
      "e",
      "por",
      "na",
      "no",
    ];
    return question
      .replace(/[?.!,;]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !stopwords.includes(word));
  }

  return nouns;
}

/**
 * Executa pesquisa na internet com informações detalhadas
 * @param question Pergunta do usuário
 */
export async function executeInternetSearch(question: string): Promise<{
  success: boolean;
  data?: string;
  error?: string;
  executionTime: number;
  source: string;
  query: string;
  keyword: string[];
  sourcesUsed: string[];
}> {
  const startTime = Date.now();
  const sourcesUsed: string[] = [];

  try {
    console.log("Pesquisando na internet...");
    const result = await searchInternet(question);

    // Determina fonte baseado no sucesso da busca
    if (
      result &&
      result !==
        "Não encontrei informações relevantes na internet. Tente reformular sua pergunta."
    ) {
      // Tenta determinar qual fonte foi usada baseado no resultado
      if (result.includes("SearX") || result.includes("searx")) {
        sourcesUsed.push("SearX Meta-Search");
      } else if (
        result.includes("DuckDuckGo") ||
        result.includes("duckduckgo")
      ) {
        sourcesUsed.push("DuckDuckGo API");
      } else if (result.includes("Wikipedia") || result.includes("wikipedia")) {
        sourcesUsed.push("Wikipedia API");
      } else {
        sourcesUsed.push("Internet APIs");
      }
    }

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime,
      source:
        sourcesUsed.length > 0 ? sourcesUsed.join(" + ") : "Múltiplas APIs",
      query: question,
      keyword: extractMainKeyword(question),
      sourcesUsed,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      source: "Múltiplas APIs",
      query: question,
      keyword: extractMainKeyword(question),
      sourcesUsed: [],
    };
  }
}
