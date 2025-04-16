import React, { useState } from 'react';
import { 
  Grid,
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  Paper,
  FormControl,
  InputLabel,
  useTheme,
  Typography
} from '@mui/material';

const MovimientoForm = ({ onAgregarMovimiento}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    monto: '',
    descripcion: '',
    formaPago: 'efectivo',
    fecha: new Date().toISOString().slice(0, 10)
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'monto' ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monto || isNaN(formData.monto)) {
      alert("Por favor ingrese un monto válido");
      return;
    }
    
    try {
      await onAgregarMovimiento({
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: new Date().toISOString()
      });
      
      // Resetear formulario después de éxito
      setFormData({
        tipo: 'ingreso',
        monto: '',
        descripcion: '',
        formaPago: 'efectivo',
        fecha: new Date().toISOString().slice(0, 10)
      });
    } catch (error) {
      // El error ya es manejado por el componente padre
    }
  };




  return (
    <Paper 
      elevation={3} 
      sx={{
        padding: theme.spacing(3),
        marginBottom: theme.spacing(3),
        backgroundColor: theme.palette.background.paper
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
        Nuevo Movimiento
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                label="Tipo"
                required
              >
                <MenuItem value="ingreso">Ingreso</MenuItem>
                <MenuItem value="egreso">Egreso</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              name="monto"
              label="Monto"
              value={formData.monto}
              onChange={handleInputChange}
              inputProps={{ min: "0", step: "0.01" }}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="descripcion"
              label="Descripción"
              value={formData.descripcion}
              onChange={handleInputChange}
              multiline
              rows={2}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Forma de Pago</InputLabel>
              <Select
                name="formaPago"
                value={formData.formaPago}
                onChange={handleInputChange}
                label="Forma de Pago"
                required
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="tarjeta">Tarjeta</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
                <MenuItem value="mercado_pago">Mercado Pago</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              name="fecha"
              label="Fecha"
              value={formData.fecha}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Registrar Movimiento
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default MovimientoForm;