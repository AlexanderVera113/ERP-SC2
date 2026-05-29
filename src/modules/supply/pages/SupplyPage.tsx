import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { generatePurchaseOrderPDF } from '../../../utils/pdfExport'; // <-- AÑADIDA LA IMPORTACIÓN DEL MOTOR PDF

interface Supplier {
  id: string;
  name: string;
  contact_email: string;
  phone: string;
  status: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  quantity: number;
  unit_cost: number;
  status: string;
  order_date: string;
  inv_suppliers: { name: string };
  inv_assets: { id: string, asset_code: string, name: string };
}

interface Asset {
  id: string;
  asset_code: string;
  name: string;
}

export default function SupplyPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Formularios
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '' });
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ supplier_id: '', asset_id: '', quantity: 0, unit_cost: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resSuppliers, resOrders, resAssets] = await Promise.all([
        supabase.from('inv_suppliers').select('*').order('name'),
        supabase.from('inv_purchase_orders').select('*, inv_suppliers(name), inv_assets(id, asset_code, name)').order('order_date', { ascending: false }),
        supabase.from('inv_assets').select('id, asset_code, name').order('asset_code')
      ]);

      if (resSuppliers.data) setSuppliers(resSuppliers.data);
      if (resOrders.data) setOrders(resOrders.data as any);
      if (resAssets.data) setAssets(resAssets.data);
    } catch (error) {
      console.error('Error de carga en Supply Chain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // OPERACIONES CRUD: PROVEEDORES
  // ==========================================
  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('inv_suppliers').insert([{
        name: newSupplier.name.trim(),
        contact_email: newSupplier.email.trim(),
        phone: newSupplier.phone.trim()
      }]);

      if (error) throw error;

      await loadData();
      setIsSupplierModalOpen(false);
      setNewSupplier({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      alert('Error de autorización o datos duplicados al guardar el proveedor.');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    const confirm = window.confirm(`[ALERTA]\n¿Estás seguro de eliminar al proveedor "${name}"?\nSi tiene órdenes de compra asociadas, también serán eliminadas.`);
    if (!confirm) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('inv_suppliers').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error al purgar proveedor:', error);
      alert('Error de privilegios (401) al intentar eliminar el registro.');
    } finally { 
      setIsProcessing(false); 
    }
  };

  // ==========================================
  // OPERACIONES CRUD: ÓRDENES DE COMPRA
  // ==========================================
  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await supabase.from('inv_purchase_orders').insert([{
        po_number: poNumber,
        supplier_id: newOrder.supplier_id,
        asset_id: newOrder.asset_id,
        quantity: Number(newOrder.quantity),
        unit_cost: Number(newOrder.unit_cost)
      }]);

      if (error) throw error;

      await loadData();
      setIsOrderModalOpen(false);
      setNewOrder({ supplier_id: '', asset_id: '', quantity: 0, unit_cost: 0 });
    } catch (error) {
      console.error('Error al crear orden:', error);
      alert('Error de red o permisos insuficientes al emitir la orden.');
    } finally { 
      setIsProcessing(false); 
    }
  };

  // FUNCIÓN CORREGIDA TRAS EL ERROR 401: PROCESA RECEPCIÓN Y SUMA AL INVENTARIO GENERAL
  const handleReceiveOrder = async (order: PurchaseOrder) => {
    if (!user) {
      alert('Sesión no detectada. Por favor, recarga la página e inicia sesión nuevamente.');
      return;
    }
    const confirm = window.confirm(`¿Confirmar recepción de ${order.quantity} unidades de ${order.inv_assets.name}? Esto actualizará el inventario general.`);
    if (!confirm) return;

    try {
      setIsProcessing(true);

      // 1. OBTENER EL STOCK ACTUAL DIRECTO DE LA TABLA CENTRAL DE ACTIVOS
      const { data: assetData, error: assetFetchError } = await supabase
        .from('inv_assets')
        .select('current_stock')
        .eq('id', order.inv_assets.id)
        .single();

      if (assetFetchError) throw assetFetchError;
      const currentStock = assetData?.current_stock ?? 0;
      const nuevoStock = currentStock + order.quantity;

      // 2. ACTUALIZAR EL ESTADO DE LA ORDEN DE COMPRA
      const { error: poError } = await supabase
        .from('inv_purchase_orders')
        .update({ status: 'RECEIVED', received_date: new Date().toISOString() })
        .eq('id', order.id);

      if (poError) throw poError;

      // 3. INYECTAR LAS UNIDADES ADQUIRIDAS DIRECTO AL INVENTARIO CENTRAL DE ACTIVOS
      const { error: stockUpdateError } = await supabase
        .from('inv_assets')
        .update({ current_stock: nuevoStock })
        .eq('id', order.inv_assets.id);

      if (stockUpdateError) throw stockUpdateError;

      // 4. REGISTRAR EN EL LOG DE TRANSACCIONES HISTÓRICAS
      const { error: transactionError } = await supabase.from('inv_transactions').insert([{
        asset_id: order.inv_assets.id,
        clerk_user_id: user.id,
        transaction_type: 'IN',
        amount: order.quantity,
        notes: `Recepción automática desde Orden de Compra ${order.po_number}`
      }]);

      if (transactionError) {
        console.warn('Alerta secundaria: Transacción histórica no registrada, pero el stock fue incrementado con éxito.');
      }

      await loadData();
    } catch (error: any) {
      console.error('Error crítico al recibir orden:', error);
      alert(`Error en el servidor (${error.status || '401 Unauthorized'}).\n\nPor favor verifica las políticas RLS en Supabase para permitir inserts/updates en tus tablas.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async (orderId: string, poNumber: string) => {
    const confirm = window.confirm(`¿Abortar la orden de compra ${poNumber}?\nEsta acción la marcará como cancelada y no afectará el inventario.`);
    if (!confirm) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('inv_purchase_orders').update({ status: 'CANCELLED' }).eq('id', orderId);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error abortando orden:', error);
      alert('Error al intentar cancelar la orden en el servidor.');
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-medium text-[#e3e2e2] mb-1">Supply Chain Management</h2>
          <p className="text-sm text-[#c4c7c7] font-mono">Gestión de proveedores y órdenes de abastecimiento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSupplierModalOpen(true)} className="bg-[#1a1c1c] border border-[#444748] text-[#c4c7c7] px-4 py-2.5 rounded font-mono text-xs font-bold hover:text-[#ffe16d] hover:border-[#ffe16d] transition-all flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">domain_add</span> NUEVO PROVEEDOR
          </button>
          <button onClick={() => setIsOrderModalOpen(true)} className="bg-[#ffe16d] text-[#221b00] px-4 py-2.5 rounded font-mono text-xs font-bold hover:bg-[#ffdb3c] transition-all shadow-[0_0_15px_rgba(255,225,109,0.15)] flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">receipt_long</span> EMITIR ORDEN
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-2 border-b border-[#444748] overflow-x-auto">
        <button onClick={() => setActiveTab('ORDERS')} className={`px-6 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'ORDERS' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>ÓRDENES DE COMPRA</button>
        <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-6 py-3 font-mono text-xs border-b-2 transition-colors cursor-pointer ${activeTab === 'SUPPLIERS' ? 'border-[#ffe16d] text-[#ffe16d]' : 'border-transparent text-[#c4c7c7] hover:text-white'}`}>CATÁLOGO PROVEEDORES</button>
      </div>

      <div className="bg-[#121414] border border-[#444748] rounded-lg overflow-hidden flex flex-col">
        
        {/* VISTA: ÓRDENES DE COMPRA */}
        {activeTab === 'ORDERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#444748] bg-[#1a1c1c]">
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">N° ORDEN</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">PROVEEDOR</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">ACTIVO SOLICITADO</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-right">CANTIDAD</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-right">COSTO TOTAL</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-center">ESTADO</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#444748]/50 hover:bg-[#1a1c1c]">
                    <td className="p-4 font-mono text-xs text-[#ffe16d] font-bold">{order.po_number}</td>
                    <td className="p-4 text-sm text-[#e3e2e2]">{order.inv_suppliers?.name}</td>
                    <td className="p-4">
                      <div className="text-sm text-[#e3e2e2]">{order.inv_assets?.name}</div>
                      <div className="font-mono text-[10px] text-[#c4c7c7]">{order.inv_assets?.asset_code}</div>
                    </td>
                    <td className="p-4 font-mono text-sm text-[#e3e2e2] text-right">{order.quantity}</td>
                    <td className="p-4 font-mono text-sm text-green-400 text-right">${(order.quantity * order.unit_cost).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      {order.status === 'PENDING' && <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-[10px] font-bold animate-pulse">EN TRÁNSITO</span>}
                      {order.status === 'RECEIVED' && <span className="bg-[#444748] text-[#c4c7c7] px-2 py-1 rounded text-[10px] font-bold">RECIBIDO</span>}
                      {order.status === 'CANCELLED' && <span className="bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 px-2 py-1 rounded text-[10px] font-bold">CANCELADO</span>}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {/* <-- BOTÓN PDF AÑADIDO A CONTINUACIÓN --> */}
                      <button onClick={() => generatePurchaseOrderPDF(order)} className="text-[#c4c7c7] hover:text-white px-2 cursor-pointer transition-colors" title="Descargar PDF">
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      </button>
                      
                      {order.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleReceiveOrder(order)} disabled={isProcessing} className="bg-[#ffe16d]/10 text-[#ffe16d] border border-[#ffe16d]/30 hover:bg-[#ffe16d]/20 px-3 py-1 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors disabled:opacity-50">
                            RECIBIR
                          </button>
                          <button onClick={() => handleCancelOrder(order.id, order.po_number)} disabled={isProcessing} className="text-[#ffb4ab] hover:text-white px-2 cursor-pointer transition-colors disabled:opacity-50" title="Anular Orden">
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !isLoading && <tr><td colSpan={7} className="p-8 text-center text-[#8e9192] font-mono text-xs">No hay órdenes de compra registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA: PROVEEDORES */}
        {activeTab === 'SUPPLIERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#444748] bg-[#1a1c1c]">
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">EMPRESA / PROVEEDOR</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">CONTACTO</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7]">TELÉFONO</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-center">ESTADO</th>
                  <th className="p-4 font-mono text-[10px] text-[#c4c7c7] text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="border-b border-[#444748]/50 hover:bg-[#1a1c1c]">
                    <td className="p-4 font-mono text-sm text-[#ffe16d] font-bold">{sup.name}</td>
                    <td className="p-4 text-sm text-[#e3e2e2]">{sup.contact_email || 'N/A'}</td>
                    <td className="p-4 font-mono text-xs text-[#c4c7c7]">{sup.phone || 'N/A'}</td>
                    <td className="p-4 text-center"><span className="bg-[#ffe16d]/10 text-[#ffe16d] border border-[#ffe16d]/30 px-2 py-1 rounded text-[10px] font-bold">ACTIVO</span></td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteSupplier(sup.id, sup.name)} disabled={isProcessing} className="text-[#c4c7c7] hover:text-[#ffb4ab] p-1 cursor-pointer disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NUEVA ORDEN DE COMPRA */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/85 backdrop-blur-sm">
          <form onSubmit={handleCreateOrder} className="bg-[#121414] border border-[#444748] rounded-xl p-6 w-full max-w-lg relative flex flex-col gap-4 shadow-[0_0_40px_rgba(255,225,109,0.05)]">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ffe16d]"></div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-mono text-[10px] text-[#ffe16d] tracking-widest uppercase">SUPPLY CHAIN</span>
                <h3 className="text-xl text-[#e3e2e2]">Emitir Orden de Compra</h3>
              </div>
              <button type="button" onClick={() => setIsOrderModalOpen(false)} className="text-[#c4c7c7] cursor-pointer hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <select required value={newOrder.supplier_id} onChange={e => setNewOrder({...newOrder, supplier_id: e.target.value})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-3 rounded outline-none focus:border-[#ffe16d]">
              <option value="">Seleccionar Proveedor...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select required value={newOrder.asset_id} onChange={e => setNewOrder({...newOrder, asset_id: e.target.value})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-3 rounded outline-none focus:border-[#ffe16d]">
              <option value="">Seleccionar Activo/Insumo a solicitar...</option>
              {assets.map(a => <option key={a.id} value={a.id}>[{a.asset_code}] {a.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input required type="number" min="1" placeholder="Cantidad" value={newOrder.quantity || ''} onChange={e => setNewOrder({...newOrder, quantity: Number(e.target.value)})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-3 rounded outline-none focus:border-[#ffe16d]" />
              <input required type="number" min="0" step="0.01" placeholder="Costo Unitario ($)" value={newOrder.unit_cost || ''} onChange={e => setNewOrder({...newOrder, unit_cost: Number(e.target.value)})} className="bg-[#1a1c1c] border border-[#444748] text-green-400 text-sm px-3 py-3 rounded outline-none focus:border-[#ffe16d]" />
            </div>

            <div className="bg-[#1a1c1c] p-3 text-right border border-[#444748] rounded mt-2 flex justify-between items-center">
              <span className="font-mono text-[10px] text-[#c4c7c7]">IMPORTE TOTAL: </span>
              <span className="text-xl font-bold text-green-400">${(newOrder.quantity * newOrder.unit_cost).toLocaleString() || 0}</span>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-[#ffe16d] text-[#221b00] py-3 rounded font-mono font-bold mt-2 cursor-pointer hover:bg-[#ffdb3c] transition-colors disabled:opacity-50">
              {isProcessing ? 'PROCESANDO...' : 'PROCESAR Y EMITIR ORDEN'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: NUEVO PROVEEDOR */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/85 backdrop-blur-sm">
          <form onSubmit={handleCreateSupplier} className="bg-[#121414] border border-[#444748] rounded-xl p-6 w-full max-w-sm relative flex flex-col gap-4 shadow-[0_0_40px_rgba(255,225,109,0.05)]">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ffe16d]"></div>
            <h3 className="text-xl text-[#e3e2e2] mb-2">Nuevo Proveedor</h3>
            <input required type="text" placeholder="Razón Social / Empresa" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-2 rounded outline-none focus:border-[#ffe16d]" />
            <input required type="email" placeholder="Email de Contacto" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-2 rounded outline-none focus:border-[#ffe16d]" />
            <input type="text" placeholder="Teléfono" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="bg-[#1a1c1c] border border-[#444748] text-[#e3e2e2] text-sm px-3 py-2 rounded outline-none focus:border-[#ffe16d]" />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 border border-[#444748] text-[#c4c7c7] py-2 rounded font-mono text-xs cursor-pointer hover:bg-[#1a1c1c]">CANCELAR</button>
              <button type="submit" disabled={isProcessing} className="flex-1 bg-[#ffe16d] text-[#221b00] py-2 rounded font-mono text-xs font-bold cursor-pointer hover:bg-[#ffdb3c] disabled:opacity-50">GUARDAR</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}