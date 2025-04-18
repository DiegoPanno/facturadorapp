//index.js

const express = require('express');
const cors = require('cors');
const facturaRoute = require('./routes/factura');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/factura', facturaRoute);

app.listen(3001, () => {
  console.log('Servidor backend escuchando en puerto 3001');
});
