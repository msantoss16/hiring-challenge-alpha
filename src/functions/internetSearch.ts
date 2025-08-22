import { exec } from "child_process";
import nlp from "compromise";
import chalk from "chalk";
import readline from "readline";

// ------------------ Controle de aprovação ------------------
let autoApprove = false;
let userApproved = false;
let rl: readline.Interface | null = null;

/**
 * Configura a interface readline compartilhada com a CLI principal
 */
export function setReadline(sharedRl: readline.Interface) {
  rl = sharedRl;
}

/**
 * Define se comandos bash devem ser aprovados automaticamente
 */
export function setAutoApprove(approve: boolean) {
  autoApprove = approve;
}

/**
 * Reseta a aprovação do usuário para nova sessão
 */
export function resetUserApproval() {
  userApproved = false;
}

/**
 * Solicita aprovação do usuário para executar comandos bash
 */
async function requestUserApproval(command: string): Promise<boolean> {
  if (autoApprove) {
    console.log(
      chalk.green("✅ Comando aprovado automaticamente (modo teste).")
    );
    return true;
  }

  if (userApproved) {
    console.log(chalk.green("Comando aprovado (já aprovado nesta sessão)."));
    return true;
  }

  if (!rl) throw new Error("Readline não configurado para aprovações.");

  return new Promise((resolve) => {
    console.log(chalk.yellow("\nCOMANDO BASH DETECTADO"));
    console.log(chalk.cyan(`Comando: ${command}`));
    rl!.question(
      chalk.white("Deseja aprovar a execução deste comando? (s/n): "),
      (answer) => {
        const approved =
          answer.toLowerCase().startsWith("s") ||
          answer.toLowerCase().startsWith("y");

        if (approved) {
          userApproved = true;
          console.log(
            chalk.green("Aprovação concedida para esta sessão. Executando...")
          );
        } else {
          console.log(chalk.red("Comando rejeitado pelo usuário."));
        }

        resolve(approved);
      }
    );
  });
}

/**
 * Executa comando bash com aprovação do usuário
 */
export async function executeWithApproval(command: string): Promise<string> {
  const approved = await requestUserApproval(command);
  if (!approved) return "";

  return new Promise((resolve) => {
    exec(command, (err, stdout) => {
      if (err) {
        console.log(chalk.red(`Erro ao executar comando: ${err.message}`));
        resolve("");
      } else {
        resolve(stdout);
      }
    });
  });
}

// ------------------ Extração de palavras-chave ------------------
function extractMainKeyword(question: string): string[] {
  const doc = nlp(question);
  const nouns = doc.nouns().out("array");

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

// ------------------ Funções de busca individuais ------------------
async function searchSearX(
  question: string
): Promise<{ text: string; source: string }> {
  const query = encodeURIComponent(question);
  const command = `curl -s "https://searx.perennialte.ch/search?q=${query}&format=json"`;
  const stdout = await executeWithApproval(command);
  if (!stdout) return { text: "", source: "" };

  try {
    const data = JSON.parse(stdout);
    if (data.results && data.results.length > 0) {
      const first = data.results[0];
      const content = first.content || first.snippet || first.description || "";
      if (content.trim() !== "") return { text: content, source: "SearX" };
    }
    return { text: "", source: "" };
  } catch {
    return { text: "", source: "" };
  }
}

async function searchDuckDuckGo(
  question: string
): Promise<{ text: string; source: string }> {
  const keywords = extractMainKeyword(question).join(" ");
  const query = encodeURIComponent(keywords);
  const command = `curl -s "https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1&no_html=1"`;
  const stdout = await executeWithApproval(command);
  if (!stdout) return { text: "", source: "" };

  try {
    const data = JSON.parse(stdout);
    if (data.AbstractText)
      return { text: data.AbstractText, source: "DuckDuckGo" };
    if (data.RelatedTopics?.length > 0)
      return { text: data.RelatedTopics[0].Text || "", source: "DuckDuckGo" };
    return { text: "", source: "" };
  } catch {
    return { text: "", source: "" };
  }
}

async function searchWikipedia(
  question: string
): Promise<{ text: string; source: string }> {
  const keywords = extractMainKeyword(question).join(" ");
  const query = encodeURIComponent(keywords);
  const command = `curl -s "https://pt.wikipedia.org/api/rest_v1/page/summary/${query}"`;
  const stdout = await executeWithApproval(command);
  if (!stdout) return { text: "", source: "" };

  try {
    const data = JSON.parse(stdout);
    if (data.extract) return { text: data.extract, source: "Wikipedia" };
    return { text: "", source: "" };
  } catch {
    return { text: "", source: "" };
  }
}

// ------------------ Busca combinada ------------------
export async function searchInternet(
  question: string
): Promise<{ text: string; sources: string[] }> {
  const results: { text: string; source: string }[] = [];

  const searx = await searchSearX(question);
  if (searx.text) results.push(searx);

  const ddg = await searchDuckDuckGo(question);
  if (ddg.text) results.push(ddg);

  const wiki = await searchWikipedia(question);
  if (wiki.text) results.push(wiki);

  if (results.length === 0) {
    return {
      text: "Não encontrei informações relevantes na internet.",
      sources: [],
    };
  }

  return {
    text: results.map((r) => r.text).join("\n\n"),
    sources: results.map((r) => r.source),
  };
}

// ------------------ Função de execução detalhada ------------------
export async function executeInternetSearch(question: string) {
  const start = Date.now();
  try {
    const { text, sources } = await searchInternet(question);
    return {
      success: text.trim() !== "",
      data: text,
      executionTime: Date.now() - start,
      source: sources.join(" + ") || "Múltiplas APIs",
      query: question,
      keyword: extractMainKeyword(question),
      sourcesUsed: sources,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      executionTime: Date.now() - start,
      source: "Múltiplas APIs",
      query: question,
      keyword: extractMainKeyword(question),
      sourcesUsed: [],
    };
  }
}
