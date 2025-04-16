import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
} from "@mui/material";
import {
  abrirCaja,
  cerrarCaja,
  registrarMovimiento,
  obtenerCajaAbierta,
  obtenerMovimientosCaja,
} from "../../services/cajaService";
import MovimientoForm from "./MovimientoForm";
import ListaMovimientos from "./ListaMovimientos";
import CajaReporte from "./CajaReporte";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CajaPanel = () => {
  const theme = useTheme();
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState("");

  // Cargar caja abierta al iniciar
  useEffect(() => {
    const cargarCaja = async () => {
      try {
        setLoading(true);
        const cajaAbierta = await obtenerCajaAbierta();
        if (cajaAbierta) {
          setCaja(cajaAbierta);
          const movs = await obtenerMovimientosCaja(cajaAbierta.id);
          setMovimientos(movs);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarCaja();
  }, []);

  useEffect(() => {
    if (caja?.fechaApertura) {
      console.log('Tipo de fechaApertura:', typeof caja.fechaApertura);
      console.log('Contenido de fechaApertura:', caja.fechaApertura);
      console.log('Es objeto Date?', caja.fechaApertura instanceof Date);
      console.log('Tiene toDate?', typeof caja.fechaApertura.toDate === 'function');
    }
  }, [caja]);




  const handleAbrirCaja = async () => {
    try {
      setLoading(true);
      const nuevaCaja = await abrirCaja(saldoInicial);
      setCaja(nuevaCaja);
      setSaldoInicial("");
      setSuccess("Caja abierta correctamente");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarCaja = async () => {
    try {
      setLoading(true);
      const saldoFinal = prompt("Ingrese el saldo final en caja:");
      if (!saldoFinal || isNaN(saldoFinal)) return;

      await cerrarCaja(caja.id, saldoFinal);
      setCaja(null);
      setMovimientos([]);
      setSuccess("Caja cerrada correctamente");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarMovimiento = async (movimiento) => {
    try {
      setLoading(true);
      await registrarMovimiento(caja.id, movimiento);
      const movs = await obtenerMovimientosCaja(caja.id);
      setMovimientos(movs);
      setSuccess("Movimiento registrado correctamente");
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  const formatFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return "Fecha no disponible";

    // Si ya es un objeto Date
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString("es-ES");
    }

    // Si es un objeto Timestamp de Firebase
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString("es-ES");
    }

    // Si es un string ISO
    if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleString("es-ES");
    }

    return "Formato de fecha no reconocido";
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: "bold",
          mb: 3,
          pb: 1,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        Panel de Caja
      </Typography>

      {!caja ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Apertura de Caja
          </Typography>
          <TextField
            type="number"
            label="Saldo inicial"
            variant="outlined"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            sx={{ mb: 2, width: "100%", maxWidth: 300 }}
            InputProps={{ inputProps: { min: 0 } }}
          />
          <Button
            variant="contained"
            onClick={handleAbrirCaja}
            disabled={!saldoInicial || loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : "Abrir Caja"}
          </Button>
        </Paper>
      ) : (
        <>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body1">
                  <strong>Fecha apertura:</strong>{" "}
                  {formatFirebaseTimestamp(caja.fechaApertura)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body1">
                  <strong>Saldo inicial:</strong> $
                  {caja.saldoInicial?.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography
                  variant="body1"
                  sx={{
                    color:
                      caja.saldoActual >= caja.saldoInicial
                        ? "success.main"
                        : "error.main",
                    fontWeight: "bold",
                  }}
                >
                  <strong>Saldo actual:</strong> ${caja.saldoActual?.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <MovimientoForm
            onAgregarMovimiento={handleAgregarMovimiento}
            loading={loading}
          />

          <ListaMovimientos movimientos={movimientos} />

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setMostrarReporte(true)}
              disabled={loading}
            >
              Ver Reporte
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCerrarCaja}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Cerrar Caja"}
            </Button>
          </Box>
        </>
      )}

      {mostrarReporte && caja && (
        <CajaReporte
          movimientos={movimientos}
          saldoInicial={caja.saldoInicial}
          saldoFinal={caja.saldoActual}
          fechaApertura={caja.fechaApertura}
          fechaCierre={new Date()}
          onClose={() => setMostrarReporte(false)}
        />
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert severity="error" onClose={handleCloseAlert}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert severity="success" onClose={handleCloseAlert}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CajaPanel;
