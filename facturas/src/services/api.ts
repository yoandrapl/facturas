const API_URL = 'http://localhost:3001/api';

export interface SaveExcelRequest {
  tableName: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

export interface ExcelTable {
  id: number;
  table_name: string;
  file_name: string;
  sheet_name: string;
  columns: string[];
  created_at: string;
  row_count: number;
}

export interface TableData {
  table: {
    id: number;
    table_name: string;
    file_name: string;
    sheet_name: string;
    columns: string[];
    created_at: string;
  };
  rows: {
    id: number;
    data: (string | number | boolean | null)[];
  }[];
}

export const api = {
  // Guardar Excel en la base de datos
  saveExcel: async (data: SaveExcelRequest) => {
    const response = await fetch(`${API_URL}/save-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar');
    }

    return response.json();
  },

  // Obtener lista de tablas guardadas
  getTables: async (): Promise<{ success: boolean; tables: ExcelTable[] }> => {
    const response = await fetch(`${API_URL}/tables`);
    
    if (!response.ok) {
      throw new Error('Error al obtener tablas');
    }

    return response.json();
  },

  // Obtener datos de una tabla específica
  getTable: async (id: number): Promise<{ success: boolean } & TableData> => {
    const response = await fetch(`${API_URL}/tables/${id}`);
    
    if (!response.ok) {
      throw new Error('Error al obtener tabla');
    }

    return response.json();
  },

  // Eliminar tabla
  deleteTable: async (id: number) => {
    const response = await fetch(`${API_URL}/tables/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar');
    }

    return response.json();
  },
};
