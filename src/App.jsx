import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import AreaList from "./components/AreaList";
import SearchBar from "./components/SearchBar";
import ResetButton from "./components/ResetButton";
import ExportButton from "./components/ExportButton";
import Dashboard from "./components/Dashboard";
import HistoricalReports from "./components/HistoricalReports";

// 🔥 Detectar modo demo automáticamente
const isDemoMode = window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('github.io') ||
  import.meta.env.VITE_DEMO_MODE === 'true';

// 📁 Colecciones separadas para demo/producción
const getAreasCollection = () => isDemoMode ? 'areas_demo' : 'areas';
const getReportsCollection = () => isDemoMode ? 'monthly_reports_demo' : 'monthly_reports';

export default function App() {
  const [areas, setAreas] = useState([]);
  const [filteredAreas, setFilteredAreas] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);

  useEffect(() => {
    const q = query(collection(db, getAreasCollection()), orderBy("nombre"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAreas(docs);
        applyFilters(docs, filter, activeFilter);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching areas:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    applyFilters(areas, filter, activeFilter);
  }, [filter, activeFilter, areas]);

  const applyFilters = (areasList, searchFilter, statusFilter) => {
    let result = areasList.filter((a) => {
      if (searchFilter && !(a.nombre || "").toLowerCase().includes(searchFilter.toLowerCase()) &&
        !(a.cod || "").includes(searchFilter)) {
        return false;
      }

      if (statusFilter === "recibidos") return a.recibido;
      if (statusFilter === "pendientes") return !a.recibido;

      return true;
    });

    setFilteredAreas(result);
  };

  const toggleRecibido = async (area) => {
    try {
      let userEmail = 'usuario_demo@portfolio.com';
      if (auth && auth.currentUser) {
        userEmail = auth.currentUser.email;
      }

      const ref = doc(db, getAreasCollection(), area.id);
      await updateDoc(ref, {
        recibido: !area.recibido,
        updatedBy: userEmail,
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error(e);
      window.Swal.fire('Error', 'Error al actualizar. Revisa permisos de Firestore o tu conexión.', 'error');
    }
  };

  const vaciarTodo = async () => {
    const result = await window.Swal.fire({
      title: '¿Vaciar todas las marcas?',
      text: "Esta acción es irreversible.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, vaciar todo',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'custom-swal'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const snap = await getDocs(collection(db, getAreasCollection()));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, {
        recibido: false,
        updatedBy: null,
        updatedAt: null
      }));
      await batch.commit();

      window.Swal.fire('¡Listo!', 'Las marcas se vaciaron correctamente', 'success');
    } catch (e) {
      console.error(e);
      window.Swal.fire('Error', 'Error al vaciar. Revisa permisos.', 'error');
    }
  };

  const handleFilterClick = (filterType) => {
    setActiveFilter(filterType);
  };

  const exportToExcel = () => {
    const excelData = areas.map(area => ({
      'Código': area.cod,
      'Área': area.nombre,
      'Secretaría': area.padre,
      'Estado': area.recibido ? 'RECIBIDO' : 'PENDIENTE',
      'Última Actualización': area.updatedAt ?
        (area.updatedAt.seconds ?
          new Date(area.updatedAt.seconds * 1000).toLocaleString() :
          new Date(area.updatedAt).toLocaleString()) : 'No registrado',
      /* 'Actualizado Por': area.updatedBy || 'NO REGISTRADO' */
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Control de Partes');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    XLSX.writeFile(workbook, `control_partes_${dateStr}.xlsx`);

    saveMonthlyReport(areas);
  };

  const saveMonthlyReport = async (areasData) => {
    try {
      let userEmail = 'sistema_demo@portfolio.com';
      if (auth && auth.currentUser) {
        userEmail = auth.currentUser.email;
      }

      const areasPendientes = areasData.filter(area => !area.recibido);
      const now = new Date();
      const monthStr = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

      await addDoc(collection(db, getReportsCollection()), {
        month: monthStr,
        timestamp: serverTimestamp(),
        totalAreas: areasData.length,
        recibidos: areasData.filter(a => a.recibido).length,
        pendientes: areasPendientes.length,
        generatedBy: userEmail,
        areasPendientes: areasPendientes.map(area => ({
          cod: area.cod,
          nombre: area.nombre,
          padre: area.padre,
          updatedBy: area.updatedBy || 'Nunca actualizado'
        }))
      });

    } catch (error) {
      console.error('Error guardando reporte histórico:', error);
    }
  };

  const toggleHistoricalReports = () => {
    setShowHistoricalReports(!showHistoricalReports);
  };


  return (
    <div className="container">
      <Dashboard
        areas={areas}
        activeFilter={activeFilter}
        onFilterClick={handleFilterClick}
      />

      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Sistema de Control de Partes Diarios</h1>
            <p className="subtitle">Municipalidad - Gestión de áreas</p>
          </div>
          <div>
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPJr_bVmuAmS0y6JzVvkJfgVH1zMwgzjkuA0OsIxpTfolLPPOHX1diGdukqjOGrmuum8c&usqp=CAU"
              alt="Logo Municipio"
              className="logo"
            />
          </div>
        </div>
      </header>

      {/* BANNER DE DEMO */}
      {isDemoMode && (
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <div>
              <strong>MODO DEMOSTRACIÓN PORTFOLIO</strong> - Datos reales de municipalidad
              <span style={{ fontSize: '0.9rem', opacity: '0.9', marginLeft: '10px' }}>
                Sistema en producción | <strong>{areas.length} áreas cargadas</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="controls">
        <SearchBar value={filter} onChange={setFilter} />
        <ResetButton onReset={vaciarTodo} />
        <ExportButton onExport={exportToExcel} />
        <button className="historical-btn" onClick={toggleHistoricalReports}>
          <i className="fas fa-history"></i>
          {showHistoricalReports ? 'Volver al Listado' : 'Ver Histórico'}
        </button>
      </div>

      {activeFilter !== "all" && (
        <div className="filter-indicator">
          <span>
            Mostrando {activeFilter === "recibidos" ? "áreas recibidas" : "áreas pendientes"}
            <button
              onClick={() => setActiveFilter("all")}
              className="clear-filter"
            >
              <i className="fas fa-times"></i> Mostrar todas
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando áreas...</p>
        </div>
      ) : (
        <>
          {showHistoricalReports ? (
            <HistoricalReports />
          ) : (
            <>
              <AreaList areas={filteredAreas} onToggle={toggleRecibido} />
              <p className="note">
                {filteredAreas.length} {filteredAreas.length === 1 ? 'área encontrada' : 'áreas encontradas'}
                {activeFilter !== "all" && ` (filtrado por ${activeFilter})`}
                {isDemoMode && " • Modo demostración portfolio"}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}