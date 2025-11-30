import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ExcelTable } from '../services/api';
import '../styles/SavedTables.css';

export function SavedTables() {
  const [tables, setTables] = useState<ExcelTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [viewingTable, setViewingTable] = useState<boolean>(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const result = await api.getTables();
      setTables(result.tables);
    } catch (error) {
      console.error('Error al cargar tablas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTable = async (id: number) => {
    try {
      setLoading(true);
      const result = await api.getTable(id);
      setSelectedTable(result);
      setViewingTable(true);
    } catch (error) {
      console.error('Error al cargar tabla:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (id: number, tableName: string) => {
    if (!confirm(`¿Seguro que quieres eliminar la tabla "${tableName}"?`)) {
      return;
    }

    try {
      await api.deleteTable(id);
      await loadTables();
      if (selectedTable?.table.id === id) {
        setSelectedTable(null);
        setViewingTable(false);
      }
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  if (loading && tables.length === 0) {
    return <div className="loading">⏳ Cargando tablas guardadas...</div>;
  }

  if (viewingTable && selectedTable) {
    return (
      <div className="saved-tables">
        <div className="table-view-header">
          <button onClick={() => setViewingTable(false)} className="btn btn-back">
            ← Volver a la lista
          </button>
          <h2>📊 {selectedTable.table.table_name}</h2>
          <p className="table-info">
            Archivo: {selectedTable.table.file_name} | Hoja: {selectedTable.table.sheet_name} | 
            Filas: {selectedTable.rows.length}
          </p>
        </div>

        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                {selectedTable.table.columns.map((header: string, idx: number) => (
                  <th key={idx}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedTable.rows.map((row: any) => (
                <tr key={row.id}>
                  {row.data.map((cell: any, cellIdx: number) => (
                    <td key={cellIdx}>{cell ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-tables">
      <div className="tables-header">
        <h2>📚 Tablas Guardadas en la Base de Datos</h2>
        <button onClick={loadTables} className="btn btn-refresh">
          🔄 Actualizar
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="no-tables">
          <p>No hay tablas guardadas aún.</p>
          <p>Sube un archivo Excel y guárdalo en la base de datos.</p>
        </div>
      ) : (
        <div className="tables-grid">
          {tables.map((table) => (
            <div key={table.id} className="table-card">
              <div className="card-header">
                <h3>{table.table_name}</h3>
                <span className="row-count">{table.row_count} filas</span>
              </div>
              <div className="card-body">
                <p><strong>Archivo:</strong> {table.file_name}</p>
                <p><strong>Hoja:</strong> {table.sheet_name}</p>
                <p><strong>Columnas:</strong> {table.columns.length}</p>
                <p className="date">
                  <strong>Creado:</strong> {new Date(table.created_at).toLocaleString('es-ES')}
                </p>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => handleViewTable(table.id)}
                  className="btn btn-view"
                >
                  👁️ Ver Datos
                </button>
                <button
                  onClick={() => handleDeleteTable(table.id, table.table_name)}
                  className="btn btn-delete"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
