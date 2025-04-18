// src/services/pdfGenerator.js
import jsPDF from "jspdf";

export const generarFacturaPDF = ({
  razonSocial,
  cuitEmisor,
  domicilio,
  nombreCliente,
  docTipo,
  docNro,
  fecha,
  productos,
  total,
  cae,
  caeVto,
  nroFactura,
  ptoVta,
}) => {
  const doc = new jsPDF();

  doc.setFontSize(12);
  doc.text("FACTURA C", 90, 10);
  doc.setFontSize(10);
  doc.text(`Razón Social: ${razonSocial}`, 10, 20);
  doc.text(`CUIT: ${cuitEmisor}`, 10, 26);
  doc.text(`Domicilio: ${domicilio}`, 10, 32);
  doc.text(`Punto de Venta: ${ptoVta.toString().padStart(5, '0')} - Nº: ${nroFactura}`, 10, 38);
  doc.text(`Fecha de emisión: ${fecha}`, 10, 44);

  doc.text(`Cliente: ${nombreCliente}`, 10, 54);
  doc.text(`Doc (${docTipo}): ${docNro}`, 10, 60);

  doc.text("Detalle:", 10, 70);
  let y = 76;
  productos.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.descripcion} - Cant: ${item.cantidad} - $${item.precio}`, 10, y);
    y += 6;
  });

  doc.text(`TOTAL: $${total}`, 10, y + 10);
  doc.text(`CAE: ${cae}`, 10, y + 20);
  doc.text(`Vto CAE: ${caeVto}`, 10, y + 26);

  // Guarda o devuelve el archivo
  doc.save(`Factura-${ptoVta}-${nroFactura}.pdf`);
};
