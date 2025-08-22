import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

let db: Database.Database | null = null;

/**
 * Inicializa a conexão persistente com um banco SQLite específico
 * @param dbFile Nome do arquivo de banco (opcional)
 */
export function initSql(dbFile?: string) {
  if (!db) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = dbFile
      ? path.resolve(__dirname, "../../data/sqlite/", dbFile)
      : path.resolve(__dirname, "../../data/sqlite/music.db");

    if (!fs.existsSync(dbPath)) {
      throw new Error(`[SQL] Arquivo não encontrado: ${dbPath}`);
    }

    db = new Database(dbPath, { fileMustExist: true });
    console.log(`[SQL] Conectado ao banco: ${dbPath}`);
  }
}

/**
 * Lista todos os arquivos .db na pasta SQLite
 */
export function listAllDBs(): string[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const folder = path.resolve(__dirname, "../../data/sqlite");

  if (!fs.existsSync(folder)) return [];

  return fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".db"))
    .map((file) => path.join(folder, file));
}

/**
 * Percorre todos os bancos .db e extrai dados de todas as tabelas
 * Limita cada tabela a 10 linhas para não sobrecarregar
 */
export async function queryAllDBs(): Promise<
  { db: string; tables?: { table: string; rows: any[] }[]; error?: string }[]
> {
  const dbFiles = listAllDBs();
  const results: {
    db: string;
    tables?: { table: string; rows: any[] }[];
    error?: string;
  }[] = [];

  for (const dbFile of dbFiles) {
    let tempDb: Database.Database | null = null;
    try {
      tempDb = new Database(dbFile, { readonly: true });

      // Pega todas as tabelas
      const tables: string[] = tempDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table';")
        .all()
        .map((row: any) => row.name);

      const dbData: { table: string; rows: any[] }[] = [];

      for (const table of tables) {
        try {
          // Pega até 10 linhas de cada tabela
          const rows = tempDb
            .prepare(`SELECT * FROM "${table}" LIMIT 10`)
            .all();
          dbData.push({ table, rows });
        } catch (err: any) {
          dbData.push({
            table,
            rows: [{ error: err.message || err }],
          });
        }
      }

      results.push({ db: path.basename(dbFile), tables: dbData });
    } catch (err: any) {
      results.push({ db: path.basename(dbFile), error: err.message || err });
    } finally {
      if (tempDb) tempDb.close();
    }
  }

  return results;
}

/**
 * Função para consultar uma tabela específica (opcional)
 */
export function queryTable(dbFile: string, table: string, limit = 10): any[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.resolve(__dirname, "../../data/sqlite/", dbFile);

  if (!fs.existsSync(dbPath)) {
    console.error(`[SQL] Arquivo não encontrado: ${dbPath}`);
    return [];
  }

  const tempDb = new Database(dbPath, { readonly: true });
  try {
    return tempDb.prepare(`SELECT * FROM "${table}" LIMIT ${limit}`).all();
  } catch (err: any) {
    return [{ error: err.message || err }];
  } finally {
    tempDb.close();
  }
}
