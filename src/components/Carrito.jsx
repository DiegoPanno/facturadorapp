import React from "react";

const Carrito = ({ carrito, handleActualizarCantidad }) => {
    return (
      <div>
        <h3>Carrito de compras</h3>
        <ul>
          {carrito.map((prod) => (
            <li key={prod.id}>
              {prod.titulo} - ${prod.precioVenta} x {prod.cantidad} = ${prod.precioVenta * prod.cantidad}
              <button onClick={() => handleActualizarCantidad(prod.id, prod.cantidad + 1)} style={{ marginLeft: "0.5rem" }}>
                Sumar
              </button>
              <button
                onClick={() => handleActualizarCantidad(prod.id, Math.max(1, prod.cantidad - 1))}
                style={{ marginLeft: "0.5rem" }}
              >
                Restar
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  export default Carrito;
  
  