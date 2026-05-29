import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminConsole({ isOpen, onClose }: AdminConsoleProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'SC2 CORE INTERACTIVE TERMINAL [V4.2.0-STABLE]',
    'Escribe /help para listar los comandos globales de administración.',
    ''
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  if (!isOpen) return null;

  const pushToHistory = (lines: string[]) => {
    setHistory((prev) => [...prev, ...lines]);
  };

  const processCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    const args = trimmed.split(' ');
    const command = args[0].toLowerCase();

    pushToHistory([`admin@SC2:~# ${trimmed}`]);
    setIsProcessing(true);

    try {
      switch (command) {
        case '/help':
          pushToHistory([
            '--- COMANDOS DISPONIBLES DE ADMINISTRACIÓN ---',
            '  /sys                  - Estado global de la infraestructura.',
            '  /clear                - Limpiar el buffer de la terminal.',
            '  /audit                - Desplegar los últimos 5 logs inmutables.',
            '  /stock [CÓDIGO]       - Consultar stock de un activo específico.',
            '  /set-status [EMPLEADO_CÓDIGO] [ACTIVO|VACACIONES|BAJA]',
            '                        - Forzar cambio de estado en RRHH.',
            '  /supply-sum           - Balance financiero rápido de órdenes de compra.',
            '----------------------------------------------'
          ]);
          break;

        case '/clear':
          setHistory([]);
          break;

        case '/sys':
          const uptime = Math.floor(performance.now() / 1000);
          pushToHistory([
            '[INFO] INFRAESTRUCTURA STATUS: ONLINE',
            `[INFO] MOTOR BD: Supabase Postgres Realtime Engine`,
            `[INFO] NÚCLEO UI: React 18 + Vite + TS`,
            `[INFO] SESIÓN: Controlada por tokens seguros (Clerk)`,
            `[INFO] UPTIME DE INSTANCIA: ${uptime} segundos`
          ]);
          break;

        case '/audit':
          const { data: auditData } = await supabase
            .from('sys_audit_logs')
            .select('action, table_name, record_id, performed_by, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

          if (auditData && auditData.length > 0) {
            const lines = auditData.map(log => 
              `[AUDIT] ${new Date(log.created_at).toLocaleTimeString()} - ${log.performed_by || 'SISTEMA'} ejecutó [${log.action}] en tabla [${log.table_name}]`
            );
            pushToHistory(['--- LOGS DE AUDITORÍA RECIENTES ---', ...lines]);
          } else {
            pushToHistory(['[WARN] No se encontraron logs registrados en la tabla sys_audit_logs.']);
          }
          break;

        case '/stock':
          if (!args[1]) {
            pushToHistory(['[ERROR] Sintaxis incorrecta. Uso: /stock [CÓDIGO_ACTIVO]']);
            break;
          }
          const assetCode = args[1].toUpperCase();
          const { data: assetData } = await supabase
            .from('inv_assets')
            .select('name, current_stock, unit')
            .eq('asset_code', assetCode)
            .single();

          if (assetData) {
            pushToHistory([`[OK] Activo: ${assetData.name} | Existencias: ${assetData.current_stock} ${assetData.unit}`]);
          } else {
            pushToHistory([`[ERROR] No se encontró ningún activo indexado con el código ${assetCode}`]);
          }
          break;

        case '/set-status':
          if (!args[1] || !args[2]) {
            pushToHistory(['[ERROR] Sintaxis incorrecta. Uso: /set-status [CÓDIGO] [ACTIVO|VACACIONES|BAJA]']);
            break;
          }
          const empCode = args[1].toUpperCase();
          const newStatus = args[2].toUpperCase();

          if (!['ACTIVO', 'VACACIONES', 'BAJA'].includes(newStatus)) {
            pushToHistory(['[ERROR] Estado no válido. Use: ACTIVO, VACACIONES o BAJA.']);
            break;
          }

          const { data: emp } = await supabase
            .from('rrhh_employees')
            .select('id, full_name')
            .eq('employee_code', empCode)
            .single();

          if (emp) {
            const { error: updateError } = await supabase
              .from('rrhh_employees')
              .update({ status: newStatus })
              .eq('id', emp.id);

            if (updateError) throw updateError;
            pushToHistory([`[OK] Estado de "${emp.full_name}" forzado exitosamente a [${newStatus}].`]);
          } else {
            pushToHistory([`[ERROR] Empleado con código ${empCode} no mapeado.`]);
          }
          break;

        case '/supply-sum':
          const { data: poData } = await supabase
            .from('inv_purchase_orders')
            .select('quantity, unit_cost, status');

          if (poData) {
            const total = poData.reduce((acc, current) => acc + (current.quantity * current.unit_cost), 0);
            const pendingCount = poData.filter(o => o.status === 'PENDING').length;
            pushToHistory([
              '--- ESTADÍSTICAS FINANCIERAS DE COMPRA ---',
              `  Capital histórico transaccionado: $${total.toLocaleString()}`,
              `  Órdenes actualmente en tránsito: ${pendingCount}`,
              '------------------------------------------'
            ]);
          } else {
            pushToHistory(['[ERROR] Error al consolidar balances de compras.']);
          }
          break;

        default:
          pushToHistory([`[SYS] Comando no reconocido: "${command}". Digita /help para asistencia.`]);
          break;
      }
    } catch (err: any) {
      pushToHistory([`[CRITICAL ERROR] Interrupción en ejecución: ${err.message}`]);
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0c0d0d] border border-[#ffe16d]/30 rounded-lg w-full max-w-3xl h-[500px] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(255,225,109,0.05)]">
        
        {/* Top Bar */}
        <div className="bg-[#121414] border-b border-[#444748] px-4 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
            <span className="font-mono text-[10px] text-[#c4c7c7] ml-2 tracking-wider">ROOT@SC2:~</span>
          </div>
          <button onClick={onClose} className="text-[#c4c7c7] hover:text-white transition-colors cursor-pointer font-mono text-xs">[ESC_CLOSE]</button>
        </div>

        {/* Output Screen */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#e3e2e2] space-y-1 bg-[#090a0a]">
          {history.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed">{line}</div>
          ))}
          {isProcessing && <div className="text-[#ffe16d] animate-pulse">[EJECUTANDO OPERACIÓN...]</div>}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Prompt */}
        <form 
          onSubmit={(e) => { e.preventDefault(); processCommand(input); }}
          className="border-t border-[#444748] bg-[#121414] p-3 flex items-center gap-2"
        >
          <span className="font-mono text-xs text-[#ffe16d] font-bold">admin@SC2:~#</span>
          <input 
            type="text" 
            autoFocus
            disabled={isProcessing}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Introduce un comando global o de área..."
            className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-[#ffe16d] placeholder:text-[#444748]"
          />
        </form>
      </div>
    </div>
  );
}