import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Executa uma consulta SQL no banco SQLite usando better-sqlite3.
 * @param sql A query SQL a ser executada.
 * @returns Array de objetos representando as linhas retornadas, ou null em caso de erro.
 */
export function querySQLite(sql: string): Record<string, any>[] | null {
  let db: Database.Database | null = null;

  try {
    // Get the project root directory (2 levels up from src/functions)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, "../../");
    const dbPath = path.join(projectRoot, "data", "sqlite", "music.db");
    
    // Abrir conexão com o banco SQLite especificado na configuração
    db = new Database(dbPath, { readonly: true });

    // Executa a consulta e retorna todas as linhas
    const rows = db.prepare(sql).all() as Record<string, any>[];

    return rows;
  } catch (err: any) {
    console.error(
      "[SQLiteTool] Erro ao executar a consulta:",
      err.message || err
    );
    return null;
  } finally {
    // Fecha a conexão com o banco se estiver aberta
    if (db) {
      db.close();
    }
  }
} 