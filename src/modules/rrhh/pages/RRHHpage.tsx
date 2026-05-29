import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '@clerk/clerk-react';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: string;
  position: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  record_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
}

interface InventoryAsset {
  id: string;
  asset_code: string;
  name: string;
}

interface AssignmentRecord {
  id: string;
  status: string;
  assigned_at: string;
  returned_at: string | null;
  inv_assets: {
    id: string;
    asset_code: string;
    name: string;
  };
}

interface ContractRecord {
  id: string;
  employee_id: string;
  contract_type: string;
  base_salary: number;
  start_date: string;
  end_date: string | null;
  bank_account: string;
}

export default function RRHHPage() {
  const { user } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_code: '', full_name: '', email: '', department: 'TI', position: ''
  });

  // Estados del Dossier
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ATTENDANCE' | 'CONTRACTS' | 'ASSETS'>('PROFILE');
  
  // Datos del Dossier
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [availableAssets, setAvailableAssets] = useState<InventoryAsset[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [selectedAssetToAssign, setSelectedAssetToAssign] = useState('');
  
  // Estados de la Pestaña Contratos
  const [employeeContract, setEmployeeContract] = useState<ContractRecord | null>(null);
  const [contractForm, setContractForm] = useState({
    contract_type: 'INDEFINIDO',
    base_salary: 0,
    start_date: '',
    end_date: '',
    bank_account: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('rrhh_employees').select('*').order('employee_code');
      if (error) throw error;
      if (data) setEmployees(data as Employee[]);
    } catch (error) {
      console.error('Error al cargar nómina:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('rrhh_employees').insert([{
        employee_code: newEmployee.employee_code.toUpperCase().trim(),
        full_name: newEmployee.full_name.trim(),
        email: newEmployee.email.trim(),
        department: newEmployee.department,
        position: newEmployee.position.trim(),
        status: 'ACTIVO' // <-- Modificado al español
      }]);
      if (error) throw error;
      await fetchEmployees();
      setIsCreateModalOpen(false);
      setNewEmployee({ employee_code: '', full_name: '', email: '', department: 'TI', position: '' });
    } catch (error) {
      console.error('Falla al registrar:', error);
      alert('Error al registrar. Verifica el CÓDIGO.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // NUEVA FUNCIÓN: ACTUALIZAR ESTADO OPERATIVO
  // ==========================================
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedEmployee) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('rrhh_employees')
        .update({ status: newStatus })
        .eq('id', selectedEmployee.id);
      
      if (error) throw error;

      // Actualizar estado local inmediatamente para la UI
      setSelectedEmployee({ ...selectedEmployee, status: newStatus });
      await fetchEmployees();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al cambiar el estado del empleado.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // CARGAS DEL DOSSIER (Asistencia, Activos, Contrato)
  // ==========================================
  const loadAttendance = async (employeeId: string) => {
    const { data } = await supabase.from('rrhh_attendance').select('*').eq('employee_id', employeeId).order('record_date', { ascending: false }).limit(7);
    if (data) setAttendanceRecords(data);
  };

  const loadAvailableAssets = async () => {
    const { data } = await supabase.from('inv_assets').select('id, asset_code, name').order('asset_code');
    if (data) setAvailableAssets(data);
  };

  const loadAssignments = async (employeeId: string) => {
    const { data } = await supabase.from('inv_assignments').select(`id, status, assigned_at, returned_at, inv_assets (id, asset_code, name)`).eq('employee_id', employeeId).order('assigned_at', { ascending: false });
    if (data) setAssignments(data as any);
  };

  const loadContract = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.from('rrhh_contracts').select('*').eq('employee_id', employeeId).single();
      
      if (error && error.code === 'PGRST116') {
        setEmployeeContract(null);
        setContractForm({ contract_type: 'INDEFINIDO', base_salary: 0, start_date: '', end_date: '', bank_account: '' });
        return;
      }
      if (error) throw error;

      if (data) {
        setEmployeeContract(data as ContractRecord);
        setContractForm({
          contract_type: data.contract_type,
          base_salary: data.base_salary,
          start_date: data.start_date,
          end_date: data.end_date || '',
          bank_account: data.bank_account || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar contrato:', error);
    }
  };

  const openDossier = (emp: Employee) => {
    setSelectedEmployee(emp);
    setActiveTab('PROFILE');
    loadAttendance(emp.id);
    loadAvailableAssets();
    loadAssignments(emp.id);
    loadContract(emp.id);
  };

  // ==========================================
  // ACCIONES OPERATIVAS
  // ==========================================
  const handleClockAction = async (type: 'IN' | 'OUT') => {
    if (!selectedEmployee) return;
    try {
      setIsProcessing(true);
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const { data: existingRecord } = await supabase.from('rrhh_attendance').select('*').eq('employee_id', selectedEmployee.id).eq('record_date', today).single();

      if (type === 'IN') {
        if (existingRecord) alert('El empleado ya registró entrada hoy.');
        else await supabase.from('rrhh_attendance').insert([{ employee_id: selectedEmployee.id, record_date: today, clock_in: currentTime, status: 'PRESENT' }]);
      } else if (type === 'OUT') {
        if (!existingRecord) alert('Debe registrar entrada primero.');
        else if (existingRecord.clock_out) alert('El empleado ya registró salida hoy.');
        else await supabase.from('rrhh_attendance').update({ clock_out: currentTime }).eq('id', existingRecord.id);
      }
      await loadAttendance(selectedEmployee.id);
    } finally { setIsProcessing(false); }
  };

  const handleAssignAsset = async () => {
    if (!selectedEmployee || !selectedAssetToAssign) return;
    try {
      setIsProcessing(true);
      await supabase.from('inv_assignments').insert([{ employee_id: selectedEmployee.id, asset_id: selectedAssetToAssign, status: 'ACTIVE' }]);
      await loadAssignments(selectedEmployee.id);
      setSelectedAssetToAssign('');
    } finally { setIsProcessing(false); }
  };

  const handleReturnAsset = async (assignmentId: string) => {
    try {
      setIsProcessing(true);
      await supabase.from('inv_assignments').update({ status: 'RETURNED', returned_at: new Date().toISOString() }).eq('id', assignmentId);
      if (selectedEmployee) await loadAssignments(selectedEmployee.id);
    } finally { setIsProcessing(false); }
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      setIsProcessing(true);
      const payload = {
        employee_id: selectedEmployee.id,
        contract_type: contractForm.contract_type,
        base_salary: Number(contractForm.base_salary),
        start_date: contractForm.start_date,
        end_date: contractForm.end_date ? contractForm.end_date : null,
        bank_account: contractForm.bank_account
      };

      if (employeeContract) {
        await supabase.from('rrhh_contracts').update(payload).eq('id', employeeContract.id);
      } else {
        await supabase.from('rrhh_contracts').insert([payload]);
      }
      
      await loadContract(selectedEmployee.id);
      alert('Términos contractuales actualizados en la base de datos.');
    } catch (error) {
      console.error('Error guardando contrato:', error);
      alert('Error crítico al procesar el contrato.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredEmployees = employees.filter(emp => emp.full_name.toLowerCase().includes(search.toLowerCase()) || emp.employee_code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-medium text-[#e3e2e2] mb-1">Human Resources Command</h2>
          <p className="text-sm text-[#c4c7c7] font-mono">Control de personal y nómina corporativa.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#ffe16d] text-[#221b00] px-6 py-2.5 rounded font-mono text-xs font-bold hover:bg-[#ffdb3c] transition-all shadow-[0_0_15px_rgba(255,225,109,0.15)] flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">person_add</span> ALTA EMPLEADO
        </button>
      </header>

      <div className="bg-[#121414] border border-[#444748] rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c7] text-[20px]">search</span>
          <input type="text" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-sm pl-10 pr-4 py-2 outline-none" />
        </div>
        <button onClick={fetchEmployees} className="flex items-center gap-2 px-4 py-2 border border-[#444748] rounded text-[#c4c7c7] font-mono text-xs hover:text-[#ffe16d] transition-colors cursor-pointer">
          <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>sync</span> ACTUALIZAR
        </button>
      </div>

      <div className="bg-[#121414] border border-[#444748] rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#444748] bg-[#1a1c1c]">
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">CÓDIGO</th>
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">NOMBRE COMPLETO</th>
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">DEPARTAMENTO</th>
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">CARGO</th>
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-center">ESTADO</th> {/* <-- NUEVA COLUMNA --> */}
                <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-right">OPERACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-[#444748]/50 hover:bg-[#1a1c1c] transition-colors group">
                  <td className="p-4 font-mono text-xs text-[#ffe16d]">{emp.employee_code}</td>
                  <td className="p-4 text-sm text-[#e3e2e2] font-medium">{emp.full_name}<div className="text-[10px] text-[#c4c7c7] mt-0.5">{emp.email}</div></td>
                  <td className="p-4 font-mono text-[10px] text-[#c4c7c7]"><span className="bg-[#1a1c1c] border border-[#444748] rounded px-2 py-1">{emp.department}</span></td>
                  <td className="p-4 font-mono text-xs text-[#e3e2e2]">{emp.position}</td>
                  
                  {/* <-- BADGES DE ESTADO (Activo/Vacaciones/Baja) --> */}
                  <td className="p-4 text-center">
                    {emp.status === 'ACTIVO' || emp.status === 'ACTIVE' ? (
                      <span className="bg-[#ffe16d]/10 text-[#ffe16d] border border-[#ffe16d]/30 px-2 py-1 rounded text-[10px] font-bold">ACTIVO</span>
                    ) : emp.status === 'VACACIONES' ? (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold">VACACIONES</span>
                    ) : (
                      <span className="bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 px-2 py-1 rounded text-[10px] font-bold">INACTIVO</span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    <button onClick={() => openDossier(emp)} className="text-[#c4c7c7] hover:text-[#ffe16d] p-1 flex items-center justify-end gap-1 ml-auto cursor-pointer">
                      <span className="font-mono text-[10px]">DOSSIER</span>
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === DOSSIER OPERATIVO === */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121414] border border-[#444748] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(255,225,109,0.05)]">
            
            <div className="p-6 border-b border-[#444748] bg-[#1a1c1c] flex justify-between items-start relative">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ffe16d]"></div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded bg-[#2a2c2c] border border-[#444748] flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#c4c7c7]">person</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[#ffe16d] tracking-widest uppercase mb-1">CÓDIGO: {selectedEmployee.employee_code}</div>
                  <h3 className="text-2xl font-medium text-[#e3e2e2]">{selectedEmployee.full_name}</h3>
                  <div className="text-sm text-[#c4c7c7] font-mono mt-1">{selectedEmployee.position} • {selectedEmployee.department}</div>
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-[#c4c7c7] hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex px-6 border-b border-[#444748] bg-[#1a1c1c] overflow-x-auto">
              <button onClick={() => setActiveTab('PROFILE')} className={`px-4 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'PROFILE' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>PERFIL</button>
              <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-4 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'ATTENDANCE' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>ASISTENCIA</button>
              <button onClick={() => setActiveTab('CONTRACTS')} className={`px-4 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'CONTRACTS' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>CONTRATOS</button>
              <button onClick={() => setActiveTab('ASSETS')} className={`px-4 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'ASSETS' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>ACTIVOS ASIGNADOS</button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-[#121414]">
              
              {activeTab === 'PROFILE' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#1a1c1c] border border-[#444748] rounded p-4">
                    <h4 className="font-mono text-xs text-[#c4c7c7] mb-4">DATOS DE CONTACTO Y ESTADO</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-[#8e9192] font-mono mb-1">EMAIL CORPORATIVO</div>
                        <div className="text-sm text-[#e3e2e2] bg-[#121414] border border-[#444748] px-3 py-2 rounded">{selectedEmployee.email || 'No asignado'}</div>
                      </div>
                      
                      {/* <-- CONTROLADOR DE ESTADO EN EL PERFIL --> */}
                      <div className="flex flex-col gap-1.5 border-t border-[#444748]/50 pt-3">
                        <label className="font-mono text-[10px] text-[#8e9192]">ESTADO OPERATIVO</label>
                        <select 
                          value={selectedEmployee.status} 
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                          disabled={isProcessing}
                          className={`bg-[#121414] border border-[#444748] focus:border-[#ffe16d] rounded text-sm px-3 py-2 outline-none font-bold transition-colors cursor-pointer
                            ${selectedEmployee.status === 'ACTIVO' || selectedEmployee.status === 'ACTIVE' ? 'text-[#ffe16d]' : 
                              selectedEmployee.status === 'VACACIONES' ? 'text-blue-400' : 'text-[#ffb4ab]'}`
                          }
                        >
                          <option value="ACTIVO" className="text-[#e3e2e2]">ACTIVO</option>
                          <option value="VACACIONES" className="text-[#e3e2e2]">DE VACACIONES</option>
                          <option value="BAJA" className="text-[#e3e2e2]">INACTIVO / BAJA</option>
                        </select>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ATTENDANCE' && (
                 <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleClockAction('IN')} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#ffe16d]/50 hover:bg-[#ffe16d]/10 text-[#ffe16d] p-4 rounded flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
                      <span className="material-symbols-outlined text-3xl">login</span>
                      <span className="font-mono text-sm font-bold">MARCAR ENTRADA</span>
                    </button>
                    <button onClick={() => handleClockAction('OUT')} disabled={isProcessing} className="bg-[#1a1c1c] border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 p-4 rounded flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
                      <span className="material-symbols-outlined text-3xl">logout</span>
                      <span className="font-mono text-sm font-bold">MARCAR SALIDA</span>
                    </button>
                  </div>
                  <div className="border border-[#444748] rounded overflow-hidden">
                    <div className="bg-[#1a1c1c] p-3 border-b border-[#444748]"><h4 className="font-mono text-xs text-[#c4c7c7]">REGISTRO DE ÚLTIMOS 7 DÍAS</h4></div>
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-[#444748] bg-[#121414]">
                          <th className="p-3 font-mono text-[10px] text-[#c4c7c7]">FECHA</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7]">ENTRADA</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7]">SALIDA</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7]">ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map(rec => (
                          <tr key={rec.id} className="border-b border-[#444748]/30">
                            <td className="p-3 font-mono text-xs text-[#e3e2e2]">{rec.record_date}</td><td className="p-3 font-mono text-xs text-[#ffe16d]">{rec.clock_in || '--:--:--'}</td><td className="p-3 font-mono text-xs text-orange-400">{rec.clock_out || '--:--:--'}</td><td className="p-3 font-mono text-[10px] text-[#c4c7c7]">{rec.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'CONTRACTS' && (
                <div className="flex flex-col gap-6">
                  {employeeContract ? (
                    <div className="bg-[#1a1c1c] border border-[#ffe16d]/30 rounded p-4 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffe16d]"></div>
                      <div>
                        <div className="font-mono text-[10px] text-[#c4c7c7] mb-1">CONTRATO ACTUAL ACTIVO</div>
                        <div className="text-xl font-medium text-[#ffe16d]">{employeeContract.contract_type}</div>
                        <div className="font-mono text-xs text-[#8e9192] mt-1">Inicio: {employeeContract.start_date} | Cuenta: {employeeContract.bank_account || 'No registrada'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[10px] text-[#c4c7c7] mb-1">TARIFA BASE</div>
                        <div className="text-2xl font-bold text-[#e3e2e2]">${employeeContract.base_salary.toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1a1c1c] border border-[#444748] rounded p-4 text-center">
                      <span className="material-symbols-outlined text-3xl text-[#8e9192] mb-2">assignment_late</span>
                      <p className="text-[#c4c7c7] text-sm">El empleado no tiene un contrato registrado en el sistema.</p>
                    </div>
                  )}

                  <form onSubmit={handleSaveContract} className="border border-[#444748] rounded p-6 bg-[#121414]">
                    <h4 className="font-mono text-xs text-[#ffe16d] mb-4">
                      {employeeContract ? 'ACTUALIZAR TÉRMINOS DEL CONTRATO' : 'CREAR NUEVO CONTRATO'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#c4c7c7]">MODALIDAD / TIPO</label>
                        <select value={contractForm.contract_type} onChange={e => setContractForm({...contractForm, contract_type: e.target.value})} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none">
                          <option value="INDEFINIDO">Indefinido (Full-Time)</option>
                          <option value="PLAZO_FIJO">Plazo Fijo</option>
                          <option value="HONORARIOS">Boleta de Honorarios / Freelance</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#c4c7c7]">TARIFA BASE ($)</label>
                        <input required type="number" min="0" step="1" placeholder="Ej: 800000" value={contractForm.base_salary} onChange={e => setContractForm({...contractForm, base_salary: Number(e.target.value)})} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#ffe16d] font-mono text-sm px-3 py-2 outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#c4c7c7]">FECHA DE INICIO</label>
                        <input required type="date" value={contractForm.start_date} onChange={e => setContractForm({...contractForm, start_date: e.target.value})} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-sm px-3 py-2 outline-none" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#c4c7c7]">FECHA DE TÉRMINO (Opcional)</label>
                        <input type="date" value={contractForm.end_date} onChange={e => setContractForm({...contractForm, end_date: e.target.value})} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-sm px-3 py-2 outline-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mb-6">
                      <label className="font-mono text-[10px] text-[#c4c7c7]">CUENTA BANCARIA PARA DEPÓSITO</label>
                      <input type="text" placeholder="Banco - Tipo - N° de Cuenta" value={contractForm.bank_account} onChange={e => setContractForm({...contractForm, bank_account: e.target.value})} disabled={isProcessing} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none" />
                    </div>

                    <button type="submit" disabled={isProcessing} className="w-full bg-[#1a1c1c] border border-[#ffe16d]/50 text-[#ffe16d] py-3 rounded font-mono text-xs font-bold tracking-wider hover:bg-[#ffe16d]/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                      <span className={`material-symbols-outlined text-[18px] ${isProcessing ? 'animate-spin' : ''}`}>
                        {isProcessing ? 'sync' : 'save'}
                      </span>
                      {employeeContract ? 'ACTUALIZAR CONTRATO' : 'GUARDAR NUEVO CONTRATO'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'ASSETS' && (
                <div className="flex flex-col gap-6">
                  <div className="bg-[#1a1c1c] border border-[#444748] rounded p-4 flex gap-4 items-end">
                    <div className="flex-grow flex flex-col gap-1.5">
                      <label className="font-mono text-[11px] text-[#c4c7c7]">SELECCIONAR ACTIVO DEL INVENTARIO MAESTRO</label>
                      <select value={selectedAssetToAssign} onChange={e => setSelectedAssetToAssign(e.target.value)} className="w-full bg-[#121414] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none">
                        <option value="">-- Selecciona un recurso logístico --</option>
                        {availableAssets.map(asset => (<option key={asset.id} value={asset.id}>[{asset.asset_code}] - {asset.name}</option>))}
                      </select>
                    </div>
                    <button onClick={handleAssignAsset} disabled={!selectedAssetToAssign || isProcessing} className="bg-[#ffe16d] text-[#221b00] px-6 py-2 rounded font-mono text-xs font-bold transition-all disabled:opacity-50 hover:bg-[#ffdb3c] shadow-[0_0_15px_rgba(255,225,109,0.15)] flex items-center gap-2 h-[38px] cursor-pointer"><span className="material-symbols-outlined text-[16px]">link</span> VINCULAR</button>
                  </div>
                  <div className="border border-[#444748] rounded overflow-hidden">
                    <div className="bg-[#1a1c1c] p-3 border-b border-[#444748]"><h4 className="font-mono text-xs text-[#c4c7c7]">HISTORIAL DE RESPONSIVA</h4></div>
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-[#444748] bg-[#121414]">
                          <th className="p-3 font-mono text-[10px] text-[#c4c7c7]">ACTIVO</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7]">FECHA DE ENTREGA</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7] text-center">ESTADO</th><th className="p-3 font-mono text-[10px] text-[#c4c7c7] text-right">ACCIÓN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(record => (
                          <tr key={record.id} className="border-b border-[#444748]/30">
                            <td className="p-3"><div className="font-mono text-xs text-[#ffe16d]">{record.inv_assets.asset_code}</div><div className="text-sm text-[#e3e2e2]">{record.inv_assets.name}</div></td>
                            <td className="p-3 font-mono text-xs text-[#c4c7c7]">{new Date(record.assigned_at).toLocaleDateString()}</td>
                            <td className="p-3 text-center">{record.status === 'ACTIVE' ? <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-[#ffe16d]/10 text-[#ffe16d] border border-[#ffe16d]/30">EN PODER</span> : <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-[#444748] text-[#8e9192]">DEVUELTO</span>}</td>
                            <td className="p-3 text-right">
                              {record.status === 'ACTIVE' && (
                                <button onClick={() => handleReturnAsset(record.id)} disabled={isProcessing} className="text-xs font-mono text-orange-400 border border-orange-400/30 bg-orange-400/10 px-3 py-1 rounded hover:bg-orange-400/20 transition-colors disabled:opacity-50 cursor-pointer">MARCAR DEVOLUCIÓN</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Alta */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/85 backdrop-blur-sm">
           <form onSubmit={handleCreateEmployee} className="bg-[#121414] border border-[#444748] rounded-xl p-6 w-full max-w-lg shadow-[0_0_40px_rgba(255,225,109,0.05)] relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ffe16d]"></div>
            <div className="flex justify-between items-start">
              <div><span className="font-mono text-[10px] text-[#ffe16d] tracking-widest uppercase">RRHH Registry</span><h3 className="text-xl font-medium text-[#e3e2e2] mt-1">Registrar Nuevo Empleado</h3></div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-[#c4c7c7] hover:text-white cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="CÓDIGO (Ej: EMP-003)" value={newEmployee.employee_code} onChange={e => setNewEmployee(p => ({...p, employee_code: e.target.value}))} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] font-mono text-sm px-3 py-2 outline-none" />
                <select value={newEmployee.department} onChange={e => setNewEmployee(p => ({...p, department: e.target.value}))} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none">
                  <option value="TI">TI / Sistemas</option>
                  <option value="COCINA">Cocina</option>
                  <option value="OFICINA">Oficina / Administrativo</option>
                  <option value="LOGISTICA">Logística</option>
                </select>
              </div>
              <input required type="text" placeholder="Nombre Completo" value={newEmployee.full_name} onChange={e => setNewEmployee(p => ({...p, full_name: e.target.value}))} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none" />
              <input required type="email" placeholder="Correo Electrónico" value={newEmployee.email} onChange={e => setNewEmployee(p => ({...p, email: e.target.value}))} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none" />
              <input required type="text" placeholder="Cargo / Posición" value={newEmployee.position} onChange={e => setNewEmployee(p => ({...p, position: e.target.value}))} className="bg-[#1a1c1c] border border-[#444748] focus:border-[#ffe16d] rounded text-[#e3e2e2] text-sm px-3 py-2 outline-none" />
            </div>
            
            <button type="submit" disabled={isProcessing} className="w-full bg-[#ffe16d] text-[#221b00] py-3 rounded font-mono text-xs font-bold tracking-wider hover:bg-[#ffdb3c] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(255,225,109,0.1)]">
              <span className={`material-symbols-outlined text-[18px] ${isProcessing ? 'animate-spin' : ''}`}>
                {isProcessing ? 'sync' : 'person_add'}
              </span>
              {isProcessing ? 'PROCESANDO...' : 'REGISTRAR EMPLEADO'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}