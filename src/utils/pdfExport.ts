import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Definimos la interfaz estricta para que TypeScript no bloquee el build
export interface PurchaseOrderExport {
  po_number: string;
  quantity: number;
  unit_cost: number;
  status: string;
  order_date: string;
  inv_suppliers: { name: string };
  inv_assets: { id: string; asset_code: string; name: string };
}

export const generatePurchaseOrderPDF = (order: PurchaseOrderExport, companyName: string = 'SC2 LOGISTICS COMMAND') => {
  const doc = new jsPDF();

  // 1. Cabecera del Documento
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('ORDEN DE COMPRA', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(companyName, 14, 28);
  doc.text('Documento Financiero Oficial', 14, 34);

  // 2. Datos de la Orden (Lado derecho)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`N° Orden: ${order.po_number}`, 140, 20);
  doc.setFontSize(10);
  doc.text(`Fecha Emisión: ${new Date(order.order_date).toLocaleDateString()}`, 140, 28);
  doc.text(`Estado: ${order.status}`, 140, 34);

  // 3. Datos del Proveedor
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('DATOS DEL PROVEEDOR:', 14, 50);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Empresa: ${order.inv_suppliers.name}`, 14, 58);
  doc.text(`Atención: Departamento de Ventas`, 14, 64);

  // 4. Tabla de Artículos Solicitados
  const tableData = [
    [
      order.inv_assets.asset_code,
      order.inv_assets.name,
      order.quantity.toString(),
      `$${order.unit_cost.toLocaleString()}`,
      `$${(order.quantity * order.unit_cost).toLocaleString()}`
    ]
  ];

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Descripción del Activo', 'Cantidad', 'Costo Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [44, 47, 48], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // 5. Totales y Firmas
  // El bypass de (doc as any) se mantiene porque es necesario para autotable
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL A PAGAR: $${(order.quantity * order.unit_cost).toLocaleString()}`, 140, finalY + 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('_____________________________', 14, finalY + 40);
  doc.text('Firma Gerencia / Compras', 14, finalY + 48);

  // 6. Descargar el archivo
  doc.save(`${order.po_number}.pdf`);
};