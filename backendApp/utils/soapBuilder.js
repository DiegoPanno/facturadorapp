// utils/soapBuilder.js

function construirSoapRequest(factura) {
  const {
    token,
    sign,
    cuit,
    puntoVenta,
    numeroFactura,
    fecha,
    docNro,
    total,
    tipoComprobante = 11, // Factura C por defecto
    concepto = 1 // Productos
  } = factura;

  // Calculamos importes (adaptar según necesidades)
  const impNeto = (total / 1.21).toFixed(2); // Para IVA 21%
  const impIVA = (total - impNeto).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${puntoVenta}</ar:PtoVta>
          <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${concepto}</ar:Concepto>
            <ar:DocTipo>${docNro.length === 11 ? 80 : 96}</ar:DocTipo> <!-- 80 para CUIT, 96 para DNI -->
            <ar:DocNro>${docNro}</ar:DocNro>
            <ar:CbteDesde>${numeroFactura}</ar:CbteDesde>
            <ar:CbteHasta>${numeroFactura}</ar:CbteHasta>
            <ar:CbteFch>${fecha.replace(/-/g, '')}</ar:CbteFch> <!-- Formato AAAAMMDD -->
            <ar:ImpTotal>${total}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${impNeto}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpIVA>${impIVA}</ar:ImpIVA>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1.000</ar:MonCotiz>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id> <!-- 5 = 21% -->
                <ar:BaseImp>${impNeto}</ar:BaseImp>
                <ar:Importe>${impIVA}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;
}

module.exports = { construirSoapRequest };