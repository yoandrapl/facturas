import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import '../styles/ExcelViewer.css';

interface TableData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

export function ExcelViewer() {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [originalData, setOriginalData] = useState<TableData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets = workbook.SheetNames;
        setSheetNames(sheets);
        
        if (sheets.length > 0) {
          loadSheet(workbook, sheets[0]);
          setSelectedSheet(sheets[0]);
        }
      } catch (error) {
        console.error('Error al leer el archivo:', error);
      }
    };

    reader.readAsBinaryString(file);
  };

  const loadSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      const headers = (jsonData[0] as (string | number)[]).map(h => String(h));
      const rows = jsonData.slice(1) as (string | number | boolean | null)[][];
      const data = { headers, rows };
      setTableData(data);
      setOriginalData(data);
      setCurrentPage(1);
      setColumnFilters({});
      setSortConfig({ key: null, direction: 'asc' });
    }
  };

  const handleSheetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sheetName = event.target.value;
    setSelectedSheet(sheetName);
    
    const reader = new FileReader();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (file) {
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        loadSheet(workbook, sheetName);
      };
      reader.readAsBinaryString(file);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    if (!originalData) return null;

    let filtered = originalData.rows.filter((row) => {
      // Búsqueda global
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = row.some((cell) =>
          String(cell ?? '').toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Filtros por columna
      for (const [colName, filterValue] of Object.entries(columnFilters)) {
        if (!filterValue) continue;
        const colIndex = originalData.headers.indexOf(colName);
        if (colIndex === -1) continue;
        const cellValue = String(row[colIndex] ?? '').toLowerCase();
        if (!cellValue.includes(filterValue.toLowerCase())) return false;
      }

      return true;
    });

    // Ordenamiento
    if (sortConfig.key) {
      const colIndex = originalData.headers.indexOf(sortConfig.key);
      if (colIndex !== -1) {
        filtered.sort((a, b) => {
          const aVal = a[colIndex] ?? '';
          const bVal = b[colIndex] ?? '';
          const comparison =
            String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
    }

    return { headers: originalData.headers, rows: filtered };
  }, [originalData, searchTerm, sortConfig, columnFilters]);

  const paginatedData = useMemo(() => {
    if (!filteredAndSortedData) return null;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return {
      headers: filteredAndSortedData.headers,
      rows: filteredAndSortedData.rows.slice(start, end),
    };
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (!filteredAndSortedData) return;
    const csv = [
      filteredAndSortedData.headers.join(','),
      ...filteredAndSortedData.rows.map((row) =>
        row.map((cell) => `"${cell ?? ''}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_exportado.csv`;
    a.click();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: 'asc' });
    setCurrentPage(1);
  };

  const totalPages = filteredAndSortedData
    ? Math.ceil(filteredAndSortedData.rows.length / itemsPerPage)
    : 0;

  return (
    <div className="excel-viewer">
      <div className="upload-section">
        <label htmlFor="excel-input">📁 Selecciona un archivo Excel:</label>
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
        />
        {fileName && <p className="file-name">✅ Archivo: {fileName}</p>}
      </div>

      {sheetNames.length > 0 && (
        <div className="sheet-selector">
          <label htmlFor="sheet-select">📋 Selecciona una hoja:</label>
          <select
            id="sheet-select"
            value={selectedSheet}
            onChange={handleSheetChange}
          >
            {sheetNames.map((sheet) => (
              <option key={sheet} value={sheet}>
                {sheet}
              </option>
            ))}
          </select>
        </div>
      )}

      {tableData && (
        <>
          <div className="controls-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Buscar en todos los datos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="action-buttons">
              <button onClick={handleExportCSV} className="btn btn-export">
                📥 Exportar CSV
              </button>
              {(searchTerm || Object.keys(columnFilters).length > 0) && (
                <button onClick={handleClearFilters} className="btn btn-clear">
                  ✕ Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          <div className="pagination-info">
            <span>
              Mostrando {paginatedData?.rows.length || 0} de{' '}
              {filteredAndSortedData?.rows.length || 0} filas
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>

          <div className="table-container">
            <table className="excel-table">
              <thead>
                <tr>
                  {tableData.headers.map((header, idx) => (
                    <th key={idx} className="table-header">
                      <div className="header-content">
                        <span
                          className="header-text"
                          onClick={() => handleSort(header)}
                        >
                          {header}
                          {sortConfig.key === header && (
                            <span className="sort-icon">
                              {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                            </span>
                          )}
                        </span>
                        <input
                          type="text"
                          placeholder="Filtrar..."
                          value={columnFilters[header] || ''}
                          onChange={(e) =>
                            handleColumnFilter(header, e.target.value)
                          }
                          className="filter-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData?.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {tableData.headers.map((_, cellIdx) => (
                      <td key={cellIdx}>{row[cellIdx] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-pagination"
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-pagination"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
