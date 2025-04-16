import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    doc, 
    updateDoc, 
    serverTimestamp, 
    increment,
    limit, // Añade esta importación
    getDoc // Añade esta importación si no está
  } from 'firebase/firestore';
  import { db } from '../firebase';
  
  // ABRIR CAJA (mejorada)
  export const abrirCaja = async (saldoInicial, usuario) => {
    try {
      // Verificar si ya hay caja abierta
      const cajaAbierta = await getDocs(query(
        collection(db, "caja"),
        where("estado", "==", "abierta"),
        limit(1) // Usamos limit correctamente importado
      ));
      
      if (!cajaAbierta.empty) {
        throw new Error("Ya existe una caja abierta");
      }
  
      const nuevaApertura = {
        fechaApertura: serverTimestamp(),
        saldoInicial: Number(saldoInicial),
        estado: "abierta",
        saldoActual: Number(saldoInicial),
        usuario: usuario || "admin"
      };
      
      const docRef = await addDoc(collection(db, "caja"), nuevaApertura);
      return { id: docRef.id, ...nuevaApertura };
    } catch (error) {
      console.error("Error al abrir caja:", error);
      throw error;
    }
  };
  
  // CERRAR CAJA (mejorada)
  export const cerrarCaja = async (idCaja, saldoFinal) => {
    try {
      const cajaRef = doc(db, "caja", idCaja);
      
      // Obtener todos los movimientos de esta caja
      const movimientos = await obtenerMovimientosCaja(idCaja);
      
      const totalVentas = movimientos
        .filter(mov => mov.tipo === 'ingreso')
        .reduce((sum, mov) => sum + mov.monto, 0);
      
      await updateDoc(cajaRef, {
        estado: "cerrada",
        fechaCierre: serverTimestamp(),
        saldoFinal: Number(saldoFinal),
        totalVentas,
        diferencia: Number(saldoFinal) - (totalVentas + (await getDoc(cajaRef)).data().saldoInicial)
      });
      
      return true;
    } catch (error) {
      console.error("Error al cerrar caja:", error);
      throw error;
    }
  };
  
  // REGISTRAR MOVIMIENTO (mejorada)
  export const registrarMovimiento = async (idCaja, movimiento) => {
    try {
      // Validación de datos
      if (!idCaja) throw new Error("ID de caja no proporcionado");
      if (!movimiento || typeof movimiento !== 'object') {
        throw new Error("Datos de movimiento inválidos");
      }
  
      // Validar campos requeridos
      const requiredFields = ['tipo', 'monto', 'descripcion', 'formaPago'];
      for (const field of requiredFields) {
        if (!movimiento[field]) {
          throw new Error(`Campo requerido faltante: ${field}`);
        }
      }
  
      const movimientosRef = collection(db, "caja", idCaja, "movimientos");
      const movimientoData = {
        ...movimiento,
        fecha: serverTimestamp(),
        monto: Number(movimiento.monto),
        usuario: "usuario_actual" // Asegúrate de usar el usuario real
      };
  
      const docRef = await addDoc(movimientosRef, movimientoData);
      
      // Actualizar saldo en caja
      await updateDoc(doc(db, "caja", idCaja), {
        saldoActual: increment(movimiento.tipo === 'ingreso' ? movimiento.monto : -movimiento.monto)
      });
  
      return docRef.id;
    } catch (error) {
      console.error("Error detallado al registrar movimiento:", {
        error,
        idCaja,
        movimiento
      });
      throw new Error(`Error al registrar movimiento: ${error.message}`);
    }
  };
  
  // OBTENER MOVIMIENTOS DE CAJA
  export const obtenerMovimientosCaja = async (idCaja) => {
    try {
      const q = query(
        collection(db, "caja", idCaja, "movimientos"),
        orderBy("fecha", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate()
      }));
    } catch (error) {
      console.error("Error obteniendo movimientos:", error);
      throw error;
    }
  };
  
  // OBTENER CAJA ABIERTA
  export const obtenerCajaAbierta = async () => {
    try {
      const q = query(
        collection(db, "caja"),
        where("estado", "==", "abierta"),
        orderBy("fechaApertura", "desc"),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const docData = querySnapshot.docs[0].data();
      
      // Asegurar que la fecha es un Timestamp
      if (!docData.fechaApertura) {
        throw new Error("La caja no tiene fecha de apertura");
      }
      
      return {
        id: querySnapshot.docs[0].id,
        ...docData,
        fechaApertura: docData.fechaApertura // Mantener como Timestamp
      };
    } catch (error) {
      console.error("Error obteniendo caja abierta:", error);
      throw error;
    }
  };