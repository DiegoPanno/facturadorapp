// routes/factura.js
router.post('/factura-monotributo', async (req, res) => {
  try {
    const { puntoVenta, productos, cliente } = req.body;
    
    // 1. Validar datos obligatorios
    if (!puntoVenta || !productos?.length) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // 2. Obtener próximo número (de Firebase)
    const secuenciaRef = doc(db, "secuencias", "facturasC");
    const nuevaSecuencia = await updateDoc(secuenciaRef, {
      ultima: increment(1)
    }, { merge: true });

    const nroFactura = (nuevaSecuencia?.ultima || 0) + 1;
    const nroFormateado = nroFactura.toString().padStart(8, '0');

    // 3. Crear objeto factura válido
    const factura = {
      tipo: "FACTURA_C",
      puntoVenta,
      numero: nroFormateado,
      fecha: new Date().toISOString().split('T')[0],
      productos,
      cliente: cliente || {
        tipoDoc: 99, // Consumidor Final
        nroDoc: "99999999",
        nombre: "CONSUMIDOR FINAL"
      },
      total: req.body.total,
      iva: req.body.total * 0.21, // Incluido para monotributo
      leyenda: "Emisor Monotributista - RG 4895/2023",
      validaComoFactura: true,
      timestamp: new Date()
    };

    // 4. Guardar en Firebase
    const facturaRef = doc(db, "facturas", `${puntoVenta}-${nroFormateado}`);
    await setDoc(facturaRef, factura);

    res.json({
      ...factura,
      qrData: generarQRFactura(factura) // Implementar esta función
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});