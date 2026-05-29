import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface InventoryStats {
  totalItems: number;
  criticalAlerts: number;
}

interface TransactionLog {
  id: string;
  asset_id: string;
  clerk_user_id: string;
  transaction_type: string;
  amount: number;
  created_at: string;
  inv_assets: { name: string; asset_code: string };
}

// Interfaz para los datos del gráfico
interface ChartData {
  time: string;
  volume: number;
  type: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, criticalAlerts: 0 });
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener KPIs
      const { data: assets } = await supabase.from('vw_inventory_status').select('*');
      
      if (assets) {
        const criticals = assets.filter(a => a.status === 'critical').length;
        setStats({ totalItems: assets.length, criticalAlerts: criticals });
      }

      // 2. Obtener el Log de Eventos (Últimas 15 transacciones para tener datos en el gráfico)
      const { data: transactions } = await supabase
        .from('inv_transactions')
        .select(`
          id, transaction_type, amount, created_at, clerk_user_id,
          inv_assets (name, asset_code)
        `)
        .order('created_at', { ascending: false })
        .limit(15);

      if (transactions) {
        // Separamos las últimas 5 para la tabla de logs
        setLogs(transactions.slice(0, 5) as any);
        
        // Mapeamos y revertimos el array para que el gráfico vaya de más antiguo (izquierda) a más nuevo (derecha)
        const formattedChartData = transactions.map(t => ({
          time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          volume: Number(t.amount),
          type: t.transaction_type
        })).reverse();

        setChartData(formattedChartData);
      }
    } catch (error) {
      console.error("Error al cargar telemetría del dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Variables calculadas para las alertas
  const hasCriticals = stats.criticalAlerts > 0;
  const cardBorderClass = hasCriticals ? 'border-[#ffb4ab]/50' : 'border-[#444748]';
  const textAlertClass = hasCriticals ? 'text-[#ffb4ab]' : 'text-[#c4c7c7]';
  const textValueClass = hasCriticals ? 'text-[#ffb4ab]' : 'text-[#e3e2e2]';
  const textSubAlertClass = hasCriticals ? 'text-[#ffb4ab]/70' : 'text-[#c4c7c7]';

  // Componente de Tooltip personalizado para mantener la estética oscura
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isInput = payload[0].payload.type === 'IN';
      return (
        <div className="bg-[#1a1c1c] border border-[#444748] p-3 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <p className="font-mono text-[10px] text-[#c4c7c7] mb-1">HORA: {label}</p>
          <p className={`font-mono text-sm font-bold ${isInput ? 'text-[#ffe16d]' : 'text-orange-400'}`}>
            {isInput ? 'ENTRADA' : 'SALIDA'}: {payload[0].value} UNIDADES
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-500">
      
      {/* Cabecera */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h2 className="text-2xl font-medium text-[#e3e2e2] mb-1">System Overview</h2>
          <p className="text-sm text-[#c4c7c7]">Telemetría en tiempo real de SC2.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-mono text-[10px] text-[#c4c7c7] bg-[#1a1c1c] px-3 py-1.5 rounded border border-[#444748]">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-orange-400' : 'bg-[#ffe16d] animate-pulse'}`}></span>
            {isLoading ? 'SYNCING...' : 'SYSTEM ONLINE'}
          </span>
        </div>
      </header>

      {/* KPIs Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#121414] border border-[#444748] rounded-lg p-4 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffe16d] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6">
            <span className="font-mono text-xs text-[#c4c7c7]">ACTIVOS MONITOREADOS</span>
            <span className="material-symbols-outlined text-[#ffe16d] text-[20px]">memory</span>
          </div>
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-4xl font-semibold text-[#e3e2e2] tracking-tight">{stats.totalItems}</span>
          </div>
        </div>

        <div className={`bg-[#121414] border rounded-lg p-4 flex flex-col relative overflow-hidden ${cardBorderClass}`}>
           {hasCriticals && <div className="absolute inset-0 bg-[#93000a]/5 pointer-events-none"></div>}
           <div className="flex justify-between items-start mb-6">
              <span className={`font-mono text-xs ${textAlertClass}`}>CRITICAL ALERTS</span>
              <span className={`material-symbols-outlined text-[20px] ${textAlertClass}`}>warning</span>
           </div>
           <div className="flex items-baseline gap-2 mt-auto">
              <span className={`text-4xl font-semibold tracking-tight ${textValueClass}`}>
                {stats.criticalAlerts}
              </span>
              <span className={`font-mono text-sm ${textSubAlertClass}`}>
                requieren atención
              </span>
           </div>
        </div>
      </section>

      {/* Gráficos y Tablas */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Gráfico Recharts (Ocupa 2 columnas en pantallas grandes) */}
        <div className="xl:col-span-2 bg-[#121414] border border-[#444748] rounded-lg p-4 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-[#e3e2e2]">Throughput Analysis (Volume)</h3>
            <div className="flex gap-2">
              <span className="px-2 py-1 border border-[#ffe16d] bg-[#ffe16d]/10 rounded font-mono text-[10px] text-[#ffe16d]">LIVE VOL</span>
            </div>
          </div>
          
          {/* CONTENEDOR CORREGIDO: Altura fija obligatoria h-[300px] para evitar el error -1 */}
          <div className="w-full h-[300px] relative mt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffe16d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ffe16d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444748" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#8e9192" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    fontFamily="monospace"
                  />
                  <YAxis 
                    stroke="#8e9192" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    fontFamily="monospace"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#ffe16d" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xs text-[#8e9192]">Esperando datos de telemetría...</span>
              </div>
            )}
          </div>
        </div>

        {/* Log de Eventos en Vivo (Ocupa 1 columna) */}
        <div className="bg-[#121414] border border-[#444748] rounded-lg flex flex-col h-[400px]">
          <div className="p-4 border-b border-[#444748] flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#e3e2e2]">Event Log</h3>
            <button onClick={fetchDashboardData} className="text-[#c4c7c7] hover:text-[#ffe16d] transition-colors cursor-pointer">
              <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#444748] hover:bg-[#1a1c1c] transition-colors group">
                    <td className="p-3 w-10 text-center">
                      <div className={`w-2 h-2 rounded-full mx-auto shadow-[0_0_8px_rgba(255,225,109,0.5)] ${log.transaction_type === 'IN' ? 'bg-[#ffe16d]' : 'bg-orange-500'}`}></div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-[11px] text-[#e3e2e2]">
                        {log.transaction_type === 'IN' ? 'IN' : 'OUT'} | {log.inv_assets.asset_code}
                      </div>
                      <div className="font-mono text-[9px] text-[#c4c7c7] mt-0.5 truncate max-w-[120px]">
                        Op: {log.clerk_user_id.slice(-6)}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-[9px] text-[#c4c7c7]">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !isLoading && (
                  <tr><td colSpan={3} className="p-8 text-center text-[#c4c7c7] font-mono text-xs">No hay transacciones.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}