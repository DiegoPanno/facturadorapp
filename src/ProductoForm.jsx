import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import BuscadorProductos from "./components/BuscadorProductos";
import { actualizarProducto, eliminarProducto, agregarProducto } from "./services/productService";

const ProductoForm = ({ 
  productoEdit = null, // Valor por defecto
  onProductoGuardado = () => {}, // Función por defecto
  onProductoEliminado = () => {}, // Función por defecto
  setEditando = () => {} // Función por defecto
}) => {
  const [producto, setProducto] = useState({
    id: "",
    codigoBarras: "",
    titulo: "",
    descripcion: "",
    precioBase: "",
    margen: "",
    stock: "",
    categoria: "",
    proveedor: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [productoExiste, setProductoExiste] = useState(false);

  // Efecto para cargar datos del producto a editar
  useEffect(() => {
    // Limpiar el formulario si no hay producto para editar
    if (!productoEdit) {
      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: ""
      });
      setProductoExiste(false);
      return;
    }

    // Cargar datos del producto a editar
    setProducto({
      id: productoEdit.id || "",
      codigoBarras: productoEdit.codigoBarras || "",
      titulo: productoEdit.titulo || "",
      descripcion: productoEdit.descripcion || "",
      precioBase: productoEdit.precioBase || "",
      margen: productoEdit.margen || "",
      stock: productoEdit.stock || "",
      categoria: productoEdit.categoria || "",
      proveedor: productoEdit.proveedor || ""
    });
    setProductoExiste(true);

  }, [productoEdit]); // Solo se ejecuta cuando productoEdit cambia

  // Función para verificar existencia del producto
  useEffect(() => {
    const verificarExistenciaProducto = async () => {
      if (producto.id && !productoEdit) {
        try {
          const docRef = doc(db, "productos", producto.id);
          const docSnap = await getDoc(docRef);
          setProductoExiste(docSnap.exists());
        } catch (error) {
          console.error("Error al verificar producto:", error);
          setProductoExiste(false);
        }
      }
    };

    verificarExistenciaProducto();
  }, [producto.id, productoEdit]);


  // Verificar existencia del producto cuando cambia el ID
  useEffect(() => {
    const verificarExistencia = async () => {
      if (producto.id && !productoEdit) {
        try {
          const docRef = doc(db, "productos", producto.id);
          const docSnap = await getDoc(docRef);
          setProductoExiste(docSnap.exists());
        } catch (error) {
          console.error("Error verificando producto:", error);
          setProductoExiste(false);
        }
      }
    };
    
    verificarExistencia();
  }, [producto.id, productoEdit]);

  const calcularPrecioVenta = (precioBase, margen) => {
    const base = parseFloat(precioBase);
    const ganancia = parseFloat(margen);
    if (isNaN(base) || isNaN(ganancia)) return "";
    return (base * (1 + ganancia / 100)).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación mejorada
    if (!producto.titulo?.trim()) {
      alert("El nombre del producto es requerido");
      return;
    }
  
    // Convertir y validar números
    const precioBase = parseFloat(producto.precioBase) || 0;
    const margen = parseFloat(producto.margen) || 0;
  
    if (isNaN(precioBase) || precioBase <= 0) {
      alert("El precio base debe ser un número positivo");
      return;
    }
  
    if (isNaN(margen) || margen < 0) {
      alert("El margen debe ser un número no negativo");
      return;
    }
  
    const precioVenta = calcularPrecioVenta(producto.precioBase, producto.margen);
    const productoCompleto = { 
      ...producto,
      precioVenta,
      ultimaActualizacion: new Date().toISOString(),
      stock: producto.stock ? parseInt(producto.stock) : 0,
      // Agregar marca de tiempo de creación si es nuevo producto
      ...(!producto.id && { fechaCreacion: new Date().toISOString() })
    };
  
    setIsSaving(true);
    try {
      let resultado;
      
      if (productoEdit || producto.id) {
        // Operación de actualización o creación con ID específico
        resultado = await actualizarProducto(producto.id, productoCompleto);
        
        // Feedback más específico
        if (resultado?.created) {
          alert("🆕 Producto creado exitosamente (con ID específico)");
        } else {
          alert("✅ Producto actualizado correctamente");
        }
      } else {
        // Operación de creación con ID automático
        resultado = await agregarProducto(productoCompleto);
        alert("✅ Producto agregado exitosamente");
      }
  
      // Resetear el formulario
      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: ""
      });
  
      // Notificar al componente padre para actualizar la lista
      if (onProductoGuardado) {
        onProductoGuardado();
      }
  
      // Salir del modo edición si estamos editando
      if (productoEdit && setEditando) {
        setEditando(null);
      }
      
    } catch (error) {
      console.error("Error al guardar producto:", error);
      
      // Mensajes de error más específicos
      let mensajeError = "Ocurrió un error al guardar el producto";
      if (error.code === 'permission-denied') {
        mensajeError = "No tienes permisos para realizar esta acción";
      } else if (error.message.includes('invalid-argument')) {
        mensajeError = "Datos del producto no válidos";
      }
      
      alert(`❌ Error: ${mensajeError}`);
    } finally {
      setIsSaving(false);
    }
  };


  const handleEliminar = async () => {
    if (!producto.id) return;
    
    if (!window.confirm("¿Está seguro de eliminar este producto permanentemente?")) return;

    try {
      await eliminarProducto(producto.id);
      alert("🗑️ Producto eliminado");
      setProducto({
        id: "",
        codigoBarras: "",
        titulo: "",
        descripcion: "",
        precioBase: "",
        margen: "",
        stock: "",
        categoria: "",
        proveedor: ""
      });
      
      if (onProductoEliminado) onProductoEliminado();
      if (setEditando) setEditando(null); // Salir del modo edición
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert(`❌ Error al eliminar: ${error.message}`);
    }
  };

  const precioVenta = calcularPrecioVenta(producto.precioBase, producto.margen);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2>{productoEdit ? "Editar Producto" : "Agregar Nuevo Producto"}</h2>
      
      <BuscadorProductos 
      onSeleccionar={(producto) => {
        setProducto(producto);
        setProductoExiste(true);
      }} 
    />

      {producto.id && (
        <div style={{ 
          color: productoExiste ? 'green' : 'orange', 
          margin: "10px 0",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          borderLeft: `4px solid ${productoExiste ? 'green' : 'orange'}`
        }}>
          {productoExiste ? 
            "✔ Este producto ya existe y será actualizado" : 
            "⚠ Este ID no existe, se creará un nuevo producto"}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff"
      }}>
        <div>
          <label>ID del Producto*</label>
          <input
            type="text"
            name="id"
            value={producto.id}
            onChange={handleChange}
            placeholder="ID único del producto"
            required
            disabled={!!productoEdit}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Código de Barras</label>
          <input
            type="text"
            name="codigoBarras"
            value={producto.codigoBarras}
            onChange={handleChange}
            placeholder="Código de barras (opcional)"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Nombre del Producto*</label>
          <input
            type="text"
            name="titulo"
            value={producto.titulo}
            onChange={handleChange}
            placeholder="Nombre descriptivo del producto"
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={producto.descripcion}
            onChange={handleChange}
            placeholder="Descripción detallada del producto"
            rows="3"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Precio Base*</label>
            <input
              type="number"
              name="precioBase"
              value={producto.precioBase}
              onChange={handleChange}
              placeholder="Precio de costo"
              required
              min="0"
              step="0.01"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div>
            <label>Margen de Ganancia (%)*</label>
            <input
              type="number"
              name="margen"
              value={producto.margen}
              onChange={handleChange}
              placeholder="Porcentaje de ganancia"
              required
              min="0"
              step="0.1"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        </div>

        <div>
          <label>Precio de Venta</label>
          <input
            type="text"
            value={precioVenta ? `$${precioVenta}` : ""}
            readOnly
            style={{ 
              width: "100%", 
              padding: "8px",
              backgroundColor: "#f0f0f0",
              fontWeight: "bold"
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Stock Disponible</label>
            <input
              type="number"
              name="stock"
              value={producto.stock}
              onChange={handleChange}
              placeholder="Cantidad en stock"
              min="0"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div>
            <label>Categoría</label>
            <input
              type="text"
              name="categoria"
              value={producto.categoria}
              onChange={handleChange}
              placeholder="Categoría del producto"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div>
            <label>Proveedor</label>
            <input
              type="text"
              name="proveedor"
              value={producto.proveedor}
              onChange={handleChange}
              placeholder="Proveedor principal"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          marginTop: "1.5rem",
          justifyContent: "flex-end"
        }}>
          {producto.id && (
            <button
              type="button"
              onClick={handleEliminar}
              disabled={isSaving}
              style={{
                padding: "10px 15px",
                backgroundColor: "#ffebee",
                color: "#c62828",
                border: "1px solid #ef9a9a",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {isSaving ? "Eliminando..." : "Eliminar Producto"}
            </button>
          )}

          <button 
            type="submit" 
            disabled={isSaving}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {isSaving ? "Guardando..." : 
             productoEdit ? "Guardar Cambios" : "Agregar Producto"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductoForm;