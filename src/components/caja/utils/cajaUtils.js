export const calcularTotalesPorFormaPago = (movimientos) => {
    if (!movimientos || !Array.isArray(movimientos)) return {};
    
    return movimientos.reduce((acc, mov) => {
      // Validación más robusta
      if (!mov || typeof mov !== 'object') return acc;
      
      const formaPago = mov.formaPago || 'sin_especificar';
      const monto = Number(mov.monto) || 0;
      const tipo = mov.tipo === 'ingreso' ? 1 : -1;
  
      acc[formaPago] = (acc[formaPago] || 0) + (monto * tipo);
      return acc;
    }, {});
  };
  
  export const calcularEstadisticasProductos = (movimientos) => {
    if (!movimientos || !Array.isArray(movimientos)) return {};
    
    return movimientos.reduce((acc, mov) => {
      // Verificamos que sea una venta y tenga productos
      if (mov.tipo !== 'ingreso' || !mov.productos || !Array.isArray(mov.productos)) return acc;
      
      mov.productos.forEach(producto => {
        // Validamos la estructura del producto
        if (!producto.id || !producto.nombre) return;
        
        const cantidad = Number(producto.cantidad) || 0;
        const precio = Number(producto.precio) || 0;
        
        if (!acc[producto.id]) {
          acc[producto.id] = {
            nombre: producto.nombre,
            cantidad: 0,
            total: 0
          };
        }
        
        acc[producto.id].cantidad += cantidad;
        acc[producto.id].total += precio * cantidad;
      });
      
      return acc;
    }, {});
  };
  
  export const formatearMoneda = (valor) => {
    const valorNumerico = Number(valor) || 0;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valorNumerico);
  };