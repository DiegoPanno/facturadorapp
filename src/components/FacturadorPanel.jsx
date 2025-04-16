import { useState, useEffect, useRef } from "react";
import { addDoc, collection, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { obtenerProductos } from "../services/productService";
import Carrito from "./Carrito";
import ClientesPanel from "./ClientesPanel";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { registrarMovimiento, obtenerCajaAbierta } from "../services/cajaService";

const FacturadorPanel = () => {
  // Estados del componente
  const [productos, setProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [medioPago, setMedioPago] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [cobroRealizado, setCobroRealizado] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const comprobanteRef = useRef(null);

  // Verificar caja abierta al cargar el componente
  useEffect(() => {
    const verificarCaja = async () => {
      try {
        const caja = await obtenerCajaAbierta();
        setCajaAbierta(caja);
      } catch (err) {
        setError("Error al verificar estado de caja");
        console.error(err);
      }
    };
    verificarCaja();
  }, []);

  // Cargar productos al montar el componente
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const lista = await obtenerProductos();
        const productosFormateados = lista.map((prod) => ({
          ...prod,
          precioVenta: Number(prod.precioVenta) || 0,
        }));
        setProductos(productosFormateados);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setError("Error al cargar productos");
      }
    };
    cargarProductos();
  }, []);

  // Filtrar productos basado en el término de búsqueda
  const productosFiltrados = searchTerm
  ? productos.filter(
      (prod) =>
        prod.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.id.includes(searchTerm)
    )
  : [];

  // Calcular el total cuando cambia el carrito
  useEffect(() => {
    const nuevoTotal = carrito.reduce(
      (acc, producto) => acc + producto.precioVenta * producto.cantidad,
      0
    );
    setTotal(nuevoTotal);
  }, [carrito]);

  // Manejar agregar producto al carrito
  const handleAgregarCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      const existe = prevCarrito.find((p) => p.id === producto.id);
      const precio = Number(producto.precioVenta) || 0;

      if (existe) {
        return prevCarrito.map((p) =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, precioVenta: precio }
            : p
        );
      }
      return [
        ...prevCarrito,
        { ...producto, cantidad: 1, precioVenta: precio },
      ];
    });
  };

  // Manejar cambio de cantidad en el carrito
  const handleActualizarCantidad = (id, cantidad) => {
    if (cantidad < 1) {
      setCarrito(carrito.filter((item) => item.id !== id));
      return;
    }
    setCarrito(carrito.map((item) => (item.id === id ? { ...item, cantidad } : item)));
  };

  // Generar PDF del comprobante
  const generarPDF = async (returnBlob = false) => {
    if (!comprobanteRef.current || carrito.length === 0) return;

    try {
      const canvas = await html2canvas(comprobanteRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      if (!returnBlob) {
        const nombreArchivo = `${tipoDocumento || "Comprobante"}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`;
        pdf.save(nombreArchivo);
        setSuccess(`✅ ${tipoDocumento || "Comprobante"} generado exitosamente`);
        return nombreArchivo;
      }

      return pdf.output("blob");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      setError("❌ Error al generar el documento");
      throw error;
    }
  };

  const handleCobrar = async () => {
    if (carrito.length === 0) {
      setError("No hay productos en el carrito");
      return;
    }

    if (!cajaAbierta?.id) {
      setError("No hay caja abierta. Abra caja primero.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 1. Generar PDF
      const pdfBlob = await generarPDF(true);
      
      // 2. Registrar movimiento
      const movimiento = {
        tipo: "ingreso",
        monto: total * 1.21,
        descripcion: `Venta ${tipoDocumento || "Recibo"} ${clienteSeleccionado?.nombre || "Consumidor Final"}`,
        formaPago: medioPago || "efectivo",
        productos: carrito.map(item => ({
          id: item.id,
          nombre: item.titulo,
          cantidad: item.cantidad,
          precio: item.precioVenta,
        })),
      };

      await registrarMovimiento(cajaAbierta.id, movimiento);

      // 3. Actualizar saldo en caja
      const cajaRef = doc(db, "caja", cajaAbierta.id);
      await updateDoc(cajaRef, {
        saldoActual: increment(total * 1.21)
      });

      // 4. Resetear estado
      setCarrito([]);
      setTotal(0);
      setCobroRealizado(true);
      setSuccess("✅ Venta registrada correctamente en caja");
      
    } catch (error) {
      console.error("Error al registrar cobro:", error);
      setError(`❌ Error al registrar cobro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Componente de vista previa del comprobante
  const VistaPreviaRecibo = () => (
    <div
      ref={comprobanteRef}
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff",
        maxWidth: "210mm",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "2px solid #333", paddingBottom: "10px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Tienda libre de gluten</h2>
          <p style={{ margin: "5px 0" }}>CUIT: 20-26703609-9</p>
          <p style={{ margin: "5px 0" }}>Dirección: 9 de julio 2957</p>
          <p style={{ margin: "5px 0" }}>Teléfono: (223) 6364740</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>{tipoDocumento || "COMPROBANTE"}</h2>
          <p style={{ margin: "5px 0" }}>N°: {Math.floor(Math.random() * 10000).toString().padStart(8, "0")}</p>
          <p style={{ margin: "5px 0" }}>Fecha: {new Date().toLocaleDateString("es-AR")}</p>
          <p style={{ margin: "5px 0" }}>Hora: {new Date().toLocaleTimeString("es-AR")}</p>
        </div>
      </div>

      {/* Datos del Cliente */}
      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
        <h3 style={{ marginBottom: "10px", borderBottom: "1px solid #ddd" }}>Datos del Cliente</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <p style={{ margin: "5px 0" }}>
              <strong>Nombre:</strong> {clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : "CONSUMIDOR FINAL"}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>CUIT/DNI:</strong> {clienteSeleccionado?.cuit || "11-11111111-1"}
            </p>
          </div>
          <div>
            <p style={{ margin: "5px 0" }}>
              <strong>Dirección:</strong> {clienteSeleccionado?.direccion || "-"}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Teléfono:</strong> {clienteSeleccionado?.telefono || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Detalle de Productos */}
      <h3 style={{ marginBottom: "10px" }}>Detalle de Productos/Servicios</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "14px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Código</th>
            <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Descripción</th>
            <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Cantidad</th>
            <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #ddd" }}>P. Unitario</th>
            <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #ddd" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {carrito.map((producto) => {
            const precio = Number(producto.precioVenta) || 0;
            const subtotal = precio * producto.cantidad;
            return (
              <tr key={producto.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>{producto.id}</td>
                <td style={{ padding: "8px" }}>{producto.titulo}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{producto.cantidad}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>${precio.toFixed(2)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>${subtotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <div style={{ width: "300px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>IVA 21%:</span>
            <span>${(total * 0.21).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2em", fontWeight: "bold", borderTop: "1px solid #333", paddingTop: "10px", marginTop: "10px" }}>
            <span>Total:</span>
            <span>${(total * 1.21).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Medio de Pago y Observaciones */}
      <div style={{ marginTop: "30px", paddingTop: "10px", borderTop: "1px dashed #999", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <p><strong>Medio de Pago:</strong> {medioPago || "No especificado"}</p>
          <p><strong>Forma de Pago:</strong> Contado</p>
        </div>
        <div>
          <p><strong>Observaciones:</strong></p>
          <p>Gracias por su compra</p>
        </div>
      </div>

      {/* Pie de Página */}
      <div style={{ marginTop: "40px", paddingTop: "10px", borderTop: "1px solid #333", fontSize: "0.8em", textAlign: "center" }}>
        <p>Este documento no válido como factura</p>
        <p>Original - Cliente / Duplicado - Archivo</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", fontFamily: "Arial, sans-serif" }}>
      {/* Columna izquierda - Productos y búsqueda */}
      <div>
        <h2 style={{ marginBottom: "1.5rem", color: "#333", borderBottom: "2px solid #4caf50", paddingBottom: "10px" }}>Facturación</h2>

        {/* Estado de caja */}
        {cajaAbierta ? (
          <div style={{ 
            padding: "10px", 
            marginBottom: "1rem", 
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
            border: "1px solid #c8e6c9"
          }}>
            <strong>Caja abierta:</strong> Saldo actual: ${cajaAbierta.saldoActual?.toFixed(2)}
          </div>
        ) : (
          <div style={{ 
            padding: "10px", 
            marginBottom: "1rem", 
            backgroundColor: "#ffebee",
            borderRadius: "4px",
            border: "1px solid #ef9a9a"
          }}>
            <strong>Caja cerrada:</strong> No se pueden registrar ventas
          </div>
        )}

        {/* Mostrar mensajes de error/success */}
        {error && (
          <div style={{ 
            padding: "10px", 
            marginBottom: "1rem", 
            backgroundColor: "#ffebee",
            borderRadius: "4px",
            border: "1px solid #ef9a9a",
            color: "#c62828"
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ 
            padding: "10px", 
            marginBottom: "1rem", 
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
            border: "1px solid #c8e6c9",
            color: "#2e7d32"
          }}>
            {success}
          </div>
        )}

        {/* Buscador de productos */}
        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="text"
            placeholder="Buscar producto por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* Listado de productos filtrados */}
        {searchTerm && (
          <div style={{ border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff", overflow: "hidden", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {productosFiltrados.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#666", backgroundColor: "#f9f9f9" }}>
                No se encontraron productos
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {productosFiltrados.map((prod) => (
                  <li
                    key={prod.id}
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background-color 0.2s",
                      ":hover": { backgroundColor: "#f9f9f9" },
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>{prod.titulo}</div>
                      <div style={{ color: "#666", fontSize: "0.9rem", display: "flex", gap: "10px", marginTop: "5px" }}>
                        <span>Código: {prod.id}</span>
                        <span>|</span>
                        <span>Stock: {prod.stock || 0}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "bold" }}>${prod.precioVenta.toFixed(2)}</span>
                      <button
                        onClick={() => handleAgregarCarrito(prod)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#4caf50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          transition: "background-color 0.2s",
                          ":hover": { backgroundColor: "#3e8e41" },
                        }}
                      >
                        Agregar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Panel de clientes */}
        <div style={{ marginBottom: "1.5rem" }}>
          <ClientesPanel onSelect={setClienteSeleccionado} />
        </div>
      </div>

      {/* Columna derecha - Carrito y opciones */}
      <div>
        {/* Carrito de compras */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Carrito carrito={carrito} handleActualizarCantidad={handleActualizarCantidad} />
        </div>

        {/* Resumen y opciones */}
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1rem", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>Resumen</h3>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <span style={{ fontWeight: "bold" }}>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <span style={{ fontWeight: "bold" }}>IVA 21%:</span>
            <span>${(total * 0.21).toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", marginTop: "10px" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Total:</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>${(total * 1.21).toFixed(2)}</span>
          </div>
        </div>

        {/* Opciones de documento */}
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1rem", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>Configuración del Documento</h3>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Tipo de documento</label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                backgroundColor: "#fff",
              }}
            >
              <option value="">Seleccionar tipo</option>
              <option value="Factura A">Factura A</option>
              <option value="Factura B">Factura B</option>
              <option value="Recibo">Recibo</option>
              <option value="Nota de Crédito">Nota de Crédito</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Medio de pago</label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                backgroundColor: "#fff",
              }}
            >
              <option value="">Seleccionar medio</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
              <option value="Tarjeta de Débito">Tarjeta de Débito</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Mercado Pago">Mercado Pago</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
            disabled={carrito.length === 0}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: carrito.length === 0 ? "#cccccc" : "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: carrito.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              transition: "background-color 0.2s",
              ":hover": { backgroundColor: carrito.length === 0 ? "#cccccc" : "#0b7dda" },
            }}
          >
            {mostrarVistaPrevia ? "Ocultar Vista" : "Vista Previa"}
          </button>

          <button
            onClick={() => { setCarrito([]); setClienteSeleccionado(null); }}
            disabled={carrito.length === 0}
            style={{
              padding: "12px",
              backgroundColor: carrito.length === 0 ? "#cccccc" : "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: carrito.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              transition: "background-color 0.2s",
              ":hover": { backgroundColor: carrito.length === 0 ? "#cccccc" : "#d32f2f" },
            }}
          >
            Limpiar Todo
          </button>
        </div>

        {/* Vista previa y generación de PDF */}
        {mostrarVistaPrevia && carrito.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <VistaPreviaRecibo />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
              <button
                onClick={handleCobrar}
                disabled={carrito.length === 0 || cobroRealizado || !cajaAbierta || loading}
                style={{
                  padding: "12px 24px",
                  backgroundColor: carrito.length === 0 || cobroRealizado || !cajaAbierta ? "#cccccc" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: carrito.length === 0 || cobroRealizado || !cajaAbierta ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {loading ? "Procesando..." : cobroRealizado ? "Cobrado" : "Registrar Cobro"}
              </button>
              <button
                onClick={generarPDF}
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  backgroundColor: loading ? "#cccccc" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  transition: "background-color 0.2s",
                  ":hover": { backgroundColor: loading ? "#cccccc" : "#3e8e41" },
                }}
              >
                Generar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturadorPanel;