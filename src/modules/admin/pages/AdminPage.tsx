import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadAdminData(); }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    const [resLogs, resCat, resVal] = await Promise.all([
      supabase.from('sys_audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('sys_catalog').select('*').order('category'),
      supabase.from('vw_inventory_valuation').select('*')
    ]);
    if (resLogs.data) setLogs(resLogs.data);
    if (resCat.data) setCatalog(resCat.data);
    if (resVal.data) setValuation(resVal.data);
    setIsLoading(false);
  };

  // Utilidad de Exportación CSV (Reportabilidad)
  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(data[0]).join(",") + "\n" +
      data.map(e => Object.values(e).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-medium text-white">Panel de Control Industrial</h2>
        <button onClick={() => exportToCSV(valuation, 'reporte_valorizacion')} className="bg-[#1a1c1c] border border-[#ffe16d] text-[#ffe16d] px-4 py-2 rounded font-mono text-xs hover:bg-[#ffe16d]/10 cursor-pointer">
          EXPORTAR CSV VALORIZACIÓN
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-[#1a1c1c] p-6 rounded-lg border border-[#444748]">
          <div className="text-[#c4c7c7] text-xs font-mono mb-2">VALOR TOTAL STOCK</div>
          <div className="text-4xl text-green-400 font-bold">${valuation.reduce((acc, curr) => acc + (curr.total_value || 0), 0).toLocaleString()}</div>
        </div>
        <div className="bg-[#1a1c1c] p-6 rounded-lg border border-[#444748]">
          <div className="text-[#c4c7c7] text-xs font-mono mb-2">PARÁMETROS ACTIVOS</div>
          <div className="text-4xl text-[#ffe16d] font-bold">{catalog.length}</div>
        </div>
      </section>

      {/* Catálogos Dinámicos */}
      <section className="mb-10">
        <h3 className="text-sm font-mono text-[#c4c7c7] mb-4">CATÁLOGOS PARAMETRIZABLES</h3>
        <div className="bg-[#121414] border border-[#444748] rounded-lg overflow-hidden">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-[#1a1c1c]"><tr><th className="p-3">CATEGORÍA</th><th className="p-3">LABEL</th><th className="p-3">VALOR</th></tr></thead>
            <tbody>
              {catalog.map(c => (
                <tr key={c.id} className="border-b border-[#444748]">
                  <td className="p-3 text-[#ffe16d]">{c.category}</td>
                  <td className="p-3">{c.label}</td>
                  <td className="p-3 text-[#8e9192]">{c.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}