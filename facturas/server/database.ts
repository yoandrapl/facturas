import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, "facturas.db");
const db = new Database(dbPath);

// Crear tabla de configuración de tablas Excel
db.exec(`
  CREATE TABLE IF NOT EXISTS excel_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    columns TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla de datos Excel (dinámica)
db.exec(`
  CREATE TABLE IF NOT EXISTS excel_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    row_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES excel_tables(id)
  )
`);

export default db;
