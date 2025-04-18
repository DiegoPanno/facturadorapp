const PdfPrinter = require('pdfmake');
const fs = require('fs');

function generarFacturaPDF(datosFactura) {
  const fonts = {
    Roboto: {
      normal: 'fonts/Roboto-Regular.ttf',
      bold: 'fonts/Roboto-Medium.ttf',
      italics: 'fonts/Roboto-Italic.ttf',
      bolditalics: 'fonts/Roboto-MediumItalic.ttf'
    }
  };

  const printer = new PdfPrinter(fonts);

  const docDefinition = {
    content: [
      { text: 'Factura C', style: 'header' },
      { text: `Razón Social: ${datosFactura.emisor.razonSocial}` },
      { text: `CUIT: ${datosFactura.emisor.cuit}` },
      { text: `Domicilio: ${datosFactura.emisor.domicilio}` },
      { text: `Cliente: ${datosFactura.receptor.nombre}` },
      { text: `CUIT/DNI: ${datosFactura.receptor.cuit}` },
      { text: `Domicilio: ${datosFactura.receptor.domicilio}` },
      { text: `Fecha de Emisión: ${datosFactura.fechaEmision}` },
      { text: `Número de Comprobante: ${datosFactura.numeroComprobante}` },
      { text: `CAE: ${datosFactura.cae}` },
      { text: `Vencimiento CAE: ${datosFactura.vencimientoCae}` },
      // Agrega más detalles según sea necesario
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true
      }
    }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.pipe(fs.createWriteStream('factura.pdf'));
  pdfDoc.end();
}
