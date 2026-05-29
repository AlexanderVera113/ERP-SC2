import { useState, ReactNode } from 'react'; // <-- Purgada la importación global de React
import { Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import NotificationBell from '../components/NotificationBell';
import AdminConsole from '../components/AdminConsole'; 

export default function MainLayout({ children }: { children: ReactNode }) { // <-- Uso directo de ReactNode
  const location = useLocation();
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Función interna de Senior para verificar qué pestaña está activa y aplicar los estilos de Stitch
  const getLinkClass = (path: string) => {
    const baseClass = "flex items-center gap-4 px-4 py-2 rounded-lg font-mono text-xs transition-all duration-200";
    const activeClass = "text-[#ffe16d] bg-[#343535] shadow-[0_0_12px_rgba(255,225,109,0.15)] scale-95";
    const inactiveClass = "text-[#c4c7c7] hover:bg-[#292a2a] hover:text-[#e3e2e2]";
    
    return `${baseClass} ${location.pathname === path ? activeClass : inactiveClass}`;
  };

  // Función para la barra de navegación móvil (inferior)
  const getMobileLinkClass = (path: string) => {
    const baseClass = "flex flex-col items-center justify-center w-full h-full transition-colors";
    const activeClass = "text-[#ffe16d] bg-[#343535]";
    const inactiveClass = "text-[#c4c7c7] hover:text-[#e3e2e2]";
    
    return `${baseClass} ${location.pathname === path ? activeClass : inactiveClass}`;
  };

  return (
    <div className="bg-[#121414] text-[#e3e2e2] min-h-screen flex flex-col md:flex-row overflow-x-hidden antialiased font-inter">
      
      {/* ========================================================= */}
      {/* 1. APP BAR MÓVIL (Se oculta en Desktop a partir de md:) */}
      {/* ========================================================= */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 bg-[#121414] border-b border-[#444748] z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <button className="text-[#c4c7c7] hover:text-[#ffe16d] transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-[#ffe16d] tracking-tight">SC2 ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SIDEBAR DESKTOP (Se oculta en móvil)                   */}
      {/* ========================================================= */}
      <nav className="hidden md:flex flex-col h-screen py-6 px-2 gap-1 bg-[#1a1c1c] w-64 border-r border-[#444748] flex-shrink-0 sticky top-0 z-40">
        
        {/* Identidad de la Marca */}
        <div className="px-4 mb-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded bg-[#0a0a0a] border border-[#444748] flex items-center justify-center text-[#ffe16d]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>hexagon</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#e3e2e2] leading-tight uppercase tracking-wider">SC2</h1>
            <p className="font-mono text-[10px] text-[#ffe16d] mt-0.5">V4.2.0-STABLE</p>
          </div>
        </div>
        
        {/* Enlaces de Navegación del ERP */}
        <div className="flex flex-col gap-1 flex-grow">
          <Link to="/" className={getLinkClass('/')}>
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </Link>
          <Link to="/inventory" className={getLinkClass('/inventory')}>
            <span className="material-symbols-outlined">inventory_2</span>
            Inventory Registry
          </Link>
          <Link to="/rrhh" className={getLinkClass('/rrhh')}>
            <span className="material-symbols-outlined">engineering</span>
            Personnel (RRHH)
          </Link>
          <Link to="/supply" className={getLinkClass('/supply')}>
            <span className="material-symbols-outlined">local_shipping</span>
            Supply Chain
          </Link>
          <Link to="/admin" className={getLinkClass('/admin')}>
            <span className="material-symbols-outlined">shield_person</span>
            Panel Admin
          </Link>
        </div>
        
        {/* Sección de Soporte Técnica al fondo */}
        <div className="flex flex-col gap-1 mt-auto border-t border-[#444748] pt-4">
          <a href="#" className="flex items-center gap-4 px-4 py-2 rounded-lg text-[#c4c7c7] hover:bg-[#292a2a] hover:text-[#e3e2e2] font-mono text-xs transition-colors">
            <span className="material-symbols-outlined">support_agent</span>
            Terminal Support
          </a>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* 3. CONTENEDOR CENTRAL DEL CONTENIDO                      */}
      {/* ========================================================= */}
      <main className="flex-grow flex flex-col min-h-screen bg-[#0a0a0a] relative">
        
        {/* Barra Superior en Desktop */}
        <div className="hidden md:flex justify-between items-center w-full px-8 h-16 border-b border-[#444748] bg-[#121414]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-6 w-1/3">
            <div className="relative w-full max-w-md group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c7] text-[20px] group-focus-within:text-[#ffe16d] transition-colors">search</span>
              <input 
                type="text" 
                placeholder="Query System..." 
                className="w-full bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-xs pl-10 pr-4 py-1.5 outline-none transition-colors placeholder:text-[#c4c7c7]/50" 
              />
            </div>
          </div>
          
          {/* Perfil del Operador de Clerk */}
          <div className="flex items-center justify-end gap-4 w-2/3">
            <NotificationBell />
            <div className="h-6 w-px bg-[#444748] mx-2"></div>
            <UserButton afterSignOutUrl="/" />
            
            <button 
              onClick={() => setIsConsoleOpen(true)}
              className="ml-2 bg-[#ffe16d] text-[#221b00] px-4 py-2 rounded font-mono text-[10px] font-bold hover:bg-[#ffdb3c] transition-colors shadow-[0_0_8px_rgba(255,225,109,0.2)] cursor-pointer"
            >
              EXECUTE COMMAND
            </button>
          </div>
        </div>

        {/* Las páginas se renderizan aquí de forma fluida */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </main>

      {/* ========================================================= */}
      {/* 4. MENÚ INFERIOR TÁCTIL CORREGIDO (Solo se ve en móviles) */}
      {/* ========================================================= */}
      <nav className="md:hidden flex justify-around items-center w-full h-16 bg-[#121414] border-t border-[#444748] fixed bottom-0 z-50">
        <Link to="/" className={getMobileLinkClass('/')}>
          <span className="material-symbols-outlined text-[24px]">dashboard</span>
          <span className="font-mono text-[9px] mt-1 font-bold">Dashboard</span>
        </Link>
        <Link to="/inventory" className={getMobileLinkClass('/inventory')}>
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <span className="font-mono text-[9px] mt-1">Inventory</span>
        </Link>
        <Link to="/rrhh" className={getMobileLinkClass('/rrhh')}>
          <span className="material-symbols-outlined text-[24px]">engineering</span>
          <span className="font-mono text-[9px] mt-1">RRHH</span>
        </Link>
        <Link to="/supply" className={getMobileLinkClass('/supply')}>
          <span className="material-symbols-outlined text-[24px]">local_shipping</span>
          <span className="font-mono text-[9px] mt-1">Supply</span>
        </Link>
        <Link to="/admin" className={getMobileLinkClass('/admin')}>
          <span className="material-symbols-outlined text-[24px]">shield_person</span>
          <span className="font-mono text-[9px] mt-1">Admin</span>
        </Link>
      </nav>

      <AdminConsole isOpen={isConsoleOpen} onClose={() => setIsConsoleOpen(false)} />

    </div>
  );
}