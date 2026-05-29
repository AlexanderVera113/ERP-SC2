import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface InventoryAsset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  unit: string;
  min_critical_level: number;
  min_warning_level: number;
  current_stock: number;
}

export default function InventarioPage() {
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'TODOS' | 'TI' | 'OFICINA' | 'COCINA'>('TODOS');

  // CONTROL DE MODALES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventoryAsset | null>(null);

  // Formulario para nuevo activo
  const [newAsset, setNewAsset] = useState({
    asset_code: '',
    name: '',
    category: 'TI',
    unit: 'un',
    min_critical_level: 1,
    min_warning_level: 3,
    current_stock: 0
  });

  // Cantidad a traspasar (consumo)
  const [countToDeduct, setCountToDeduct] = useState<number>(1);

  useEffect(() => {
    fetchAssets();
  }, []);

  // CARGAR DATOS CENTRALES
  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inv_assets')
        .select('*')
        .order('asset_code');

      if (error) throw error;
      setAssets((data as InventoryAsset[]) || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRow = (asset: InventoryAsset) => {
    setEditingAsset(asset);
    setCountToDeduct(1);
    setIsModalOpen(true);
  };

  // EJECUTAR EL RETIRO DE INVENTARIO
  const handleExecuteDeduction = async () => {
    if (!editingAsset) return;

    const stockActual = editingAsset.current_stock ?? 0;

    if (countToDeduct > stockActual) {
      alert('Operación denegada: La cantidad a retirar supera las existencias en bóveda.');
      return;
    }

    const nuevoStock = stockActual - countToDeduct;

    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('inv_assets')
        .update({ current_stock: nuevoStock })
        .eq('id', editingAsset.id);

      if (error) throw error;

      await fetchAssets();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Error en la transacción con la base de datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  // REGISTRAR NUEVO ACTIVO EN BASE DE DATOS
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('inv_assets')
        .insert([newAsset]);

      if (error) {
        if (error.code === '23505') {
          alert('Error en la base de datos. Verifica que el código único no esté duplicado.');
        } else {
          throw error;
        }
        return;
      }

      // Reiniciar formulario y cerrar
      setNewAsset({
        asset_code: '',
        name: '',
        category: 'TI',
        unit: 'un',
        min_critical_level: 1,
        min_warning_level: 3,
        current_stock: 0
      });
      setIsNewAssetModalOpen(false);
      await fetchAssets();
    } catch (error) {
      console.error(error);
      alert('Error al registrar el activo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      (asset.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (asset.asset_code?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesSection = activeSection === 'TODOS' || asset.category === activeSection;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-24 text-[#e3e2e2]">
      
      {/* HEADER ORIGINAL CON EL BOTÓN AMARILLO RESTAURADO */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-medium tracking-wide">Logistics & Asset Command</h2>
          <p className="text-sm text-[#c4c7c7] font-mono">Indexación y tracking de recursos generales de la empresa.</p>
        </div>
        <button
          onClick={() => setIsNewAssetModalOpen(true)}
          className="bg-[#ffe16d] text-[#221b00] font-mono text-xs font-bold px-4 py-2.5 rounded hover:bg-[#ebd060] transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto tracking-wider shadow-md uppercase"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">add</span>
          Indexar Nuevo Activo
        </button>
      </header>

      {/* FILTROS Y BUSCADOR ORIGINALES */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#111111]/40 p-1 rounded-lg">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c7] text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Buscar por código o nomenclatura..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-sm pl-10 pr-4 py-2 outline-none transition-all" 
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex bg-[#161616] p-1 border border-[#2d2d2d] rounded items-center gap-1">
            {(['TODOS', 'TI', 'OFICINA', 'COCINA'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-1 font-mono text-xs rounded transition-colors cursor-pointer ${
                  activeSection === section ? 'bg-[#ffe16d] text-[#221b00] font-bold' : 'text-[#c4c7c7] hover:text-white'
                }`}
              >
                {section}
              </button>
            ))}
            
            <div className="w-[1px] h-4 bg-[#2d2d2d] mx-1" />

            <button
              onClick={fetchAssets}
              disabled={isLoading}
              className="p-1 text-[#c4c7c7] hover:text-white transition-all cursor-pointer flex items-center justify-center rounded bg-[#222222]/40"
              title="Sincronizar"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin text-[#ffe16d]' : ''}`}>
                sync
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CONTROL */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#222222] bg-[#161616] font-mono text-[10px] text-[#888888] tracking-wider">
                <th className="p-4 font-normal">CÓDIGO ÚNICO</th>
                <th className="p-4 font-normal">NOMENCLATURA / NOMBRE</th>
                <th className="p-4 font-normal">SECCIÓN ÚNICA</th>
                <th className="p-4 font-normal">ALERTA STOCK</th>
                <th className="p-4 font-normal text-right">STOCK ACTUAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]/40 font-sans text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-mono text-xs text-[#ffe16d] animate-pulse uppercase tracking-widest">Estableciendo enlace de datos...</td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-mono text-xs text-[#666666]">Sin registros cargados en esta vista.</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const stock = asset.current_stock ?? 0;
                  let statusLabel = <span className="text-emerald-500 text-xs font-mono font-medium tracking-wide">ESTABLE</span>;
                  
                  if (stock <= (asset.min_critical_level ?? 1)) {
                    statusLabel = <span className="text-rose-500 font-mono font-bold tracking-wide">⚠️ CRÍTICO</span>;
                  } else if (stock <= (asset.min_warning_level ?? 3)) {
                    statusLabel = <span className="text-amber-500 font-mono font-medium tracking-wide">⚠️ ADVERTENCIA</span>;
                  }

                  return (
                    <tr 
                      key={asset.id} 
                      onClick={() => handleOpenRow(asset)}
                      className="hover:bg-[#161616]/70 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 font-mono text-xs text-[#ffe16d] group-hover:underline">{asset.asset_code}</td>
                      <td className="p-4 text-[#e3e2e2] font-medium">{asset.name}</td>
                      <td className="p-4">
                        <span className="bg-[#161616] border border-[#2d2d2d] rounded px-2.5 py-0.5 font-mono text-[10px] text-[#aaa]">
                          {asset.category}
                        </span>
                      </td>
                      <td className="p-4">{statusLabel}</td>
                      <td className="p-4 text-right font-mono font-bold text-white">
                        {stock} <span className="text-[10px] text-[#666666] font-normal ml-0.5">{asset.unit || 'un'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: INDEXAR NUEVO ACTIVO */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg w-full max-w-lg relative p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="font-mono text-[10px] text-[#ffe16d] tracking-widest uppercase block mb-0.5">SYSTEM INDEXER</span>
                <h3 className="text-xl font-sans font-semibold text-white tracking-wide">Indexar Nuevo Activo</h3>
              </div>
              <button onClick={() => setIsNewAssetModalOpen(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="flex flex-col gap-4 font-mono text-xs text-[#c4c7c7]">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#888] uppercase tracking-wider">Código Único (Ej: ACT-005)</label>
                  <input
                    type="text"
                    required
                    placeholder="ACT-XXX"
                    value={newAsset.asset_code}
                    onChange={e => setNewAsset(p => ({ ...p, asset_code: e.target.value.toUpperCase() }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white outline-none focus:border-[#ffe16d]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#888] uppercase tracking-wider">Nomenclatura / Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del activo"
                    value={newAsset.name}
                    onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white font-sans text-sm outline-none focus:border-[#ffe16d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#888] uppercase tracking-wider">Categoría</label>
                  <select
                    value={newAsset.category}
                    onChange={e => setNewAsset(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white outline-none cursor-pointer focus:border-[#ffe16d]"
                  >
                    <option value="TI">TI</option>
                    <option value="OFICINA">OFICINA</option>
                    <option value="COCINA">COCINA</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#888] uppercase tracking-wider">Unidad de Medida</label>
                  <input
                    type="text"
                    required
                    placeholder="un, kg, lt, etc."
                    value={newAsset.unit}
                    onChange={e => setNewAsset(p => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white outline-none focus:border-[#ffe16d]"
                  />
                </div>
              </div>

              <div className="h-[1px] bg-[#2a2a2a] my-1" />

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-rose-400 uppercase tracking-wider">Límite Crítico</label>
                  <input
                    type="number"
                    min="0"
                    value={newAsset.min_critical_level}
                    onChange={e => setNewAsset(p => ({ ...p, min_critical_level: Number(e.target.value) }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white text-center font-bold outline-none focus:border-[#ffe16d]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-amber-500 uppercase tracking-wider">Límite Advertencia</label>
                  <input
                    type="number"
                    min="0"
                    value={newAsset.min_warning_level}
                    onChange={e => setNewAsset(p => ({ ...p, min_warning_level: Number(e.target.value) }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white text-center font-bold outline-none focus:border-[#ffe16d]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#ffe16d] uppercase tracking-wider">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newAsset.current_stock}
                    onChange={e => setNewAsset(p => ({ ...p, current_stock: Number(e.target.value) }))}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2.5 text-white text-center font-bold outline-none focus:border-[#ffe16d]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-[#ffe16d] hover:bg-[#ebd060] text-[#221b00] py-3.5 rounded font-mono text-xs font-bold tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 uppercase shadow-md mt-4"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">database</span>
                {isProcessing ? 'Sincronizando...' : '_SET REGISTRAR E INICIALIZAR'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TERMINAL TELEMETRÍA: MODAL ORIGINAL DE AJUSTE (RETIRO) */}
      {isModalOpen && editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg w-full max-w-md relative p-5 shadow-2xl">
            
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="font-mono text-[10px] text-[#ffe16d] tracking-widest uppercase block mb-0.5">TELEMETRÍA TERMINAL</span>
                <h3 className="text-lg font-sans font-semibold text-white tracking-wide">Ajustar Unidades</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Pestañas de Modo Fijas en Restar */}
            <div className="grid grid-cols-2 bg-[#1a1a1a] p-1 rounded border border-[#262626] mb-5 font-mono text-[10px] font-bold tracking-wider">
              <div className="bg-[#fca5a5] text-[#450a0a] text-center py-2 rounded shadow-sm uppercase select-none">
                RESTAR (CONSUMO)
              </div>
              <div className="text-[#555] text-center py-2 uppercase select-none flex items-center justify-center cursor-not-allowed">
                SUMAR (CARGA)
              </div>
            </div>

            <div className="bg-[#161616] border border-[#242424] rounded p-4 font-mono text-xs flex flex-col gap-2.5 mb-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[#666] text-[10px] tracking-wider uppercase">Activo:</span>
                <span className="text-white text-sm font-sans font-semibold">{editingAsset.name}</span>
              </div>
              <div className="flex flex-wrap text-[10px] tracking-wide text-[#aaa] mt-1 pt-2 border-t border-[#242424]">
                <span className="text-[#ffe16d] font-bold uppercase mr-1">CÓDIGO:</span> {editingAsset.asset_code}
                <span className="mx-2 text-[#444]">|</span>
                <span className="text-[#ffe16d] font-bold uppercase mr-1">STOCK EN BÓVEDA:</span> {editingAsset.current_stock ?? 0} {editingAsset.unit || 'un'}
              </div>
            </div>

            {/* CONTROL NUMÉRICO ORIGINAL: BLOQUES [-] [ VALUE ] [+] */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="font-mono text-[10px] text-[#888] uppercase tracking-wider">Cantidad a traspasar ({editingAsset.unit || 'un'})</label>
              
              <div className="grid grid-cols-[52px_1fr_52px] items-center w-full bg-[#161616] border border-[#2a2a2a] rounded overflow-hidden h-12">
                <button 
                  type="button"
                  onClick={() => setCountToDeduct(p => Math.max(1, p - 1))}
                  className="h-full flex items-center justify-center bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white transition-colors cursor-pointer border-r border-[#2a2a2a] text-xl font-mono"
                >
                  —
                </button>

                <input 
                  type="number"
                  min="1"
                  value={countToDeduct}
                  onChange={(e) => setCountToDeduct(Math.max(1, Number(e.target.value)))}
                  className="w-full h-full bg-transparent text-center font-mono text-lg font-bold text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button 
                  type="button"
                  onClick={() => setCountToDeduct(p => p + 1)}
                  className="h-full flex items-center justify-center bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white transition-colors cursor-pointer border-l border-[#2a2a2a] text-xl font-mono"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteDeduction}
              className="w-full bg-[#fca5a5] hover:bg-[#f87171] text-[#450a0a] py-3 rounded font-mono text-xs font-bold tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 uppercase shadow-md active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
              {isProcessing ? 'Procesando...' : 'Confirmar Retiro'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}