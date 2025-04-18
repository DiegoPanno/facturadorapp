// src/services/afip/qrGenerator.js
export const generarQRUrlAfip = (comprobante) => {
    const data = {
      ver: 1,
      fecha: comprobante.fecha, // Formato: "2025-04-18"
      cuit: Number(comprobante.cuitEmisor),
      ptoVta: comprobante.ptoVta,
      tipoCmp: comprobante.tipoComprobante, // 11 para Factura C
      nroCmp: comprobante.nroFactura,
      importe: comprobante.total,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: comprobante.docTipo,
      nroDocRec: comprobante.docNro,
      tipoCodAut: "E", // E = CAE
      codAut: Number(comprobante.cae),
    };
  
    const base64 = btoa(JSON.stringify(data));
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  };
  