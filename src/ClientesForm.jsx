import React, { useState, useEffect } from "react";
import { guardarCliente } from "./services/clientService";

const ClientesForm = ({ 
  clienteEdit = null,
  onClienteCreado = () => {},
  onCancel = () => {}
}) => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cuit, setCuit] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clienteEdit) {
      setNombre(clienteEdit.nombre || "");
      setApellido(clienteEdit.apellido || "");
      setCuit(clienteEdit.cuit || "");
      setEmail(clienteEdit.email || "");
      setTelefono(clienteEdit.telefono || "");
      setDireccion(clienteEdit.direccion || "");
    } else {
      resetForm();
    }
  }, [clienteEdit]);

  const resetForm = () => {
    setNombre("");
    setApellido("");
    setCuit("");
    setEmail("");
    setTelefono("");
    setDireccion("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const clienteData = {
      nombre,
      apellido,
      cuit,
      email,
      telefono,
      direccion
    };

    try {
      let clienteGuardado;
      
      if (clienteEdit) {
        // Actualizar cliente existente
        await guardarCliente({ ...clienteData, id: clienteEdit.id });
        clienteGuardado = { ...clienteData, id: clienteEdit.id };
      } else {
        // Crear nuevo cliente
        const docRef = await guardarCliente(clienteData);
        clienteGuardado = { ...clienteData, id: docRef.id };
      }

      onClienteCreado(clienteGuardado);
      alert(`✅ Cliente ${clienteEdit ? "actualizado" : "guardado"} exitosamente`);
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      alert(`❌ Error al guardar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>
        {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
      </h2>
      
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Nombre*</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          <div>
            <label>Apellido*</label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        </div>

        <div>
          <label>CUIT*</label>
          <input
            type="text"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Email*</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Teléfono*</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label>Dirección</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ 
          display: "flex", 
          gap: "1rem",
          justifyContent: "flex-end",
          marginTop: "1rem"
        }}>
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={{
              padding: "10px 15px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
          
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
            {isSaving ? "Guardando..." : clienteEdit ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientesForm;

