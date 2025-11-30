import { useState } from 'react'
import './App.css'
import { ExcelViewer } from './components/ExcelViewer'
import { SavedTables } from './components/SavedTables'

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'saved'>('upload')

  return (
    <>
      <div className="app-header">
        <h1>Visualizador de Tablas Excel</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Subir Excel
          </button>
          <button
            className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            💾 Tablas Guardadas
          </button>
        </div>
      </div>
      
      {activeTab === 'upload' ? <ExcelViewer /> : <SavedTables />}
    </>
  )
}

export default App
