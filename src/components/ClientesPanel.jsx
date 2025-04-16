import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ClientesForm from "../ClientesForm";
import { 
  ListItem, 
  ListItemText,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  List
} from '@mui/material';

const ClientesPanel = ({ onSelect = () => {} }) => {
  const [clientes, setClientes] = useState([]);
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEdit, setClienteEdit] = useState(null);

  useEffect(() => {
    const cargarClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const listaClientes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClientes(listaClientes);
    };

    cargarClientes();
  }, []);

  const buscarCliente = () => {
    if (!nombreBusqueda.trim()) {
      return [];
    }

    return clientes.filter((cliente) => {
      const nombreCompleto = `${cliente.nombre || ""} ${
        cliente.apellido || ""
      }`.toLowerCase();
      const cuit = (cliente.cuit || "").toLowerCase();
      const busquedaLower = nombreBusqueda.toLowerCase();

      return (
        nombreCompleto.includes(busquedaLower) || cuit.includes(busquedaLower)
      );
    });
  };

  const handleSelectCliente = (cliente) => {
    onSelect(cliente);
    setClienteEdit(cliente);
    setMostrarFormulario(true);
    setNombreBusqueda("");
  };

  const handleNuevoCliente = () => {
    setClienteEdit(null);
    setMostrarFormulario(true);
  };

  const resultadosFiltrados = buscarCliente();

  return (
    <Box sx={{ maxWidth: "600px", margin: "0 auto", p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Clientes
      </Typography>

      {!mostrarFormulario ? (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNuevoCliente}
            sx={{ mb: 2 }}
          >
            Agregar Cliente
          </Button>

          <TextField
            fullWidth
            value={nombreBusqueda}
            onChange={(e) => setNombreBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido o CUIT"
            sx={{ mb: 2 }}
          />

          {nombreBusqueda && (
            <Paper elevation={3} sx={{ mb: 2 }}>
              {resultadosFiltrados.length === 0 ? (
                <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                  No se encontraron resultados.
                </Box>
              ) : (
                <List>
                  {resultadosFiltrados.map((cliente) => (
                    <ListItem
                      key={`${cliente.id}-${cliente.nombre}`}
                      disablePadding
                      onClick={() => handleSelectCliente(cliente)}
                      sx={{
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                        p: 2
                      }}
                    >
                      <ListItemText
                        primary={`${cliente.nombre} ${cliente.apellido}`}
                        secondary={`CUIT: ${cliente.cuit || 'No especificado'}`}
                      />
                      <Box sx={{ color: "primary.main", fontWeight: "bold" }}>
                        →
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </>
      ) : (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <ClientesForm
            clienteEdit={clienteEdit}
            onClienteCreado={(nuevoCliente) => {
              if (clienteEdit) {
                setClientes((prev) =>
                  prev.map((c) => (c.id === nuevoCliente.id ? nuevoCliente : c))
                );
              } else {
                setClientes((prev) => [...prev, nuevoCliente]);
              }
              setClienteEdit(null);
              setMostrarFormulario(false);
            }}
            onCancel={() => {
              setClienteEdit(null);
              setMostrarFormulario(false);
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ClientesPanel;