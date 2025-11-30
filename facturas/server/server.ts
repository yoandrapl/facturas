import express, { Request, Response } from "express";
import cors from "cors";
import db from "./database.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Endpoint para guardar tabla Excel
app.post("/api/save-excel", (req: Request, res: Response) => {
  try {
    const { tableName, fileName, sheetName, headers, rows } = req.body;

    if (!tableName || !fileName || !sheetName || !headers || !rows) {
      res.status(400).json({ error: "Faltan datos requeridos" });
      return;
    }

    // Verificar si la tabla ya existe
    const existingTable = db
      .prepare("SELECT id FROM excel_tables WHERE table_name = ?")
      .get(tableName);

    let tableId: number;

    if (existingTable) {
      // Actualizar tabla existente
      tableId = (existingTable as any).id;

      // Eliminar datos antiguos
      db.prepare("DELETE FROM excel_data WHERE table_id = ?").run(tableId);

      // Actualizar información de la tabla
      db.prepare(
        "UPDATE excel_tables SET file_name = ?, sheet_name = ?, columns = ? WHERE id = ?"
      ).run(fileName, sheetName, JSON.stringify(headers), tableId);
    } else {
      // Crear nueva tabla
      const result = db
        .prepare(
          "INSERT INTO excel_tables (table_name, file_name, sheet_name, columns) VALUES (?, ?, ?, ?)"
        )
        .run(tableName, fileName, sheetName, JSON.stringify(headers));

      tableId = result.lastInsertRowid as number;
    }

    // Insertar filas de datos
    const insertStmt = db.prepare(
      "INSERT INTO excel_data (table_id, row_data) VALUES (?, ?)"
    );

    const insertMany = db.transaction((rows: any[]) => {
      for (const row of rows) {
        insertStmt.run(tableId, JSON.stringify(row));
      }
    });

    insertMany(rows);

    res.json({
      success: true,
      message: `Tabla "${tableName}" guardada exitosamente`,
      tableId,
      rowCount: rows.length,
    });
  } catch (error: any) {
    console.error("Error al guardar Excel:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener lista de tablas guardadas
app.get("/api/tables", (req: Request, res: Response) => {
  try {
    const tables = db
      .prepare(
        `
      SELECT 
        et.id,
        et.table_name,
        et.file_name,
        et.sheet_name,
        et.columns,
        et.created_at,
        COUNT(ed.id) as row_count
      FROM excel_tables et
      LEFT JOIN excel_data ed ON et.id = ed.table_id
      GROUP BY et.id
      ORDER BY et.created_at DESC
    `
      )
      .all();

    res.json({
      success: true,
      tables: tables.map((t: any) => ({
        ...t,
        columns: JSON.parse(t.columns),
      })),
    });
  } catch (error: any) {
    console.error("Error al obtener tablas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener datos de una tabla específica
app.get("/api/tables/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const table = db.prepare("SELECT * FROM excel_tables WHERE id = ?").get(id);

    if (!table) {
      res.status(404).json({ error: "Tabla no encontrada" });
      return;
    }

    const rows = db
      .prepare(
        "SELECT id, row_data FROM excel_data WHERE table_id = ? ORDER BY id"
      )
      .all(id);

    res.json({
      success: true,
      table: {
        ...(table as any),
        columns: JSON.parse((table as any).columns),
      },
      rows: rows.map((r: any) => ({
        id: r.id,
        data: JSON.parse(r.row_data),
      })),
    });
  } catch (error: any) {
    console.error("Error al obtener tabla:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para eliminar una tabla
app.delete("/api/tables/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Eliminar datos
    db.prepare("DELETE FROM excel_data WHERE table_id = ?").run(id);

    // Eliminar tabla
    const result = db.prepare("DELETE FROM excel_tables WHERE id = ?").run(id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Tabla no encontrada" });
      return;
    }

    res.json({ success: true, message: "Tabla eliminada exitosamente" });
  } catch (error: any) {
    console.error("Error al eliminar tabla:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos SQLite inicializada`);
});
