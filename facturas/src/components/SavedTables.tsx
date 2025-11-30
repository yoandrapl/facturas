import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ExcelTable } from '../services/api';
import * as XLSX from 'xlsx';
import '../styles/SavedTables.css';

export function SavedTables() {
  const [tables, setTables] = useState<ExcelTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [viewingTable, setViewingTable] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const handleExportToExcel = () => {
    if (!selectedTable) return;

    // Crear una nueva hoja de trabajo con los datos
    const wsData = [
      selectedTable.table.columns, // Encabezados
      ...selectedTable.rows.map((row: any) => row.data) // Filas de datos
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTable.table.sheet_name);

    // Generar archivo Excel
    const fileName = `${selectedTable.table.table_name}_exportado.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading && tables.length === 0) {
    return <div className="loading">⏳ Cargando tablas guardadas...</div>;
  }

  if (viewingTable && selectedTable) {
    // Calcular sumas por columna
    const columnSums = selectedTable.table.columns.map((_: string, colIdx: number) => {
      const values = selectedTable.rows
        .map((row: any) => row.data[colIdx])
        .filter((val: any) => typeof val === 'number' || !isNaN(parseFloat(val)));
      
      if (values.length === 0) return null;
      
      const sum = values.reduce((acc: number, val: any) => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return acc + num;
      }, 0);
      
      return {
        sum: sum.toFixed(2),
        count: values.length,
        avg: (sum / values.length).toFixed(2)
      };
    });

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
          <button onClick={handleExportToExcel} className="btn btn-export-excel">
            📥 Exportar a Excel
          </button>
        </div>

        {/* Estadísticas de columnas */}
        <div className="stats-section">
          <h3>📈 Estadísticas por Columna</h3>
          <div className="stats-grid">
            {selectedTable.table.columns.map((header: string, idx: number) => {
              const stats = columnSums[idx];
              if (!stats) return null;
              
              return (
                <div key={idx} className="stat-card">
                  <div className="stat-header">{header}</div>
                  <div className="stat-body">
                    <div className="stat-item">
                      <span className="stat-label">Suma:</span>
                      <span className="stat-value">{stats.sum}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Promedio:</span>
                      <span className="stat-value">{stats.avg}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Valores:</span>
                      <span className="stat-value">{stats.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
            <tfoot>
              <tr className="totals-row">
                {columnSums.map((stats: any, idx: number) => (
                  <td key={idx}>
                    {stats ? (
                      <strong>Σ = {stats.sum}</strong>
                    ) : (
                      ''
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  const filteredTables = tables.filter((table) =>
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.sheet_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="saved-tables">
      <div className="tables-header">
        <h2>📚 Tablas Guardadas en la Base de Datos</h2>
        <button onClick={loadTables} className="btn btn-refresh">
          🔄 Actualizar
        </button>
      </div>

      {tables.length > 0 && (
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Buscar tabla por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {tables.length === 0 ? (
        <div className="no-tables">
          <p>No hay tablas guardadas aún.</p>
          <p>Sube un archivo Excel y guárdalo en la base de datos.</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="no-tables">
          <p>No se encontraron tablas con "{searchTerm}"</p>
        </div>
      ) : (
        <div className="tables-grid">
          {filteredTables.map((table) => (
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
