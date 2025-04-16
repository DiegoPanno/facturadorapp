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
    writeBatch,
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
      const movimientos = await obtenerMovimientosCaja(idCaja);
      
      // Calcular totales de forma más robusta
      const { ingresos, egresos } = movimientos.reduce((acc, mov) => {
        const monto = Number(mov.monto) || 0;
        if (mov.tipo === 'ingreso') acc.ingresos += monto;
        else acc.egresos += monto;
        return acc;
      }, { ingresos: 0, egresos: 0 });
  
      const saldoFinalNum = Number(saldoFinal) || 0;
      const cajaSnap = await getDoc(cajaRef);
      const saldoInicial = cajaSnap.data().saldoInicial || 0;
      
      const diferencia = saldoFinalNum - (saldoInicial + ingresos - egresos);
  
      await updateDoc(cajaRef, {
        estado: "cerrada",
        fechaCierre: serverTimestamp(),
        saldoFinal: saldoFinalNum,
        totalVentas: ingresos,
        totalEgresos: egresos,
        diferencia: diferencia
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
      // Validaciones más estrictas
      if (!idCaja) throw new Error("ID de caja no proporcionado");
      if (!movimiento || typeof movimiento !== 'object') {
        throw new Error("Datos de movimiento inválidos");
      }
  
      // Convertir monto a número y validar
      const monto = Number(movimiento.monto);
      if (isNaN(monto)) throw new Error("Monto no es un número válido");
      if (monto <= 0) throw new Error("Monto debe ser positivo");
  
      // Obtener caja actual primero para evitar inconsistencias
      const cajaRef = doc(db, "caja", idCaja);
      const cajaSnap = await getDoc(cajaRef);
      if (!cajaSnap.exists()) throw new Error("Caja no encontrada");
      
      const cajaActual = cajaSnap.data();
      const nuevoSaldo = movimiento.tipo === 'ingreso' 
        ? cajaActual.saldoActual + monto 
        : cajaActual.saldoActual - monto;
  
      // Usar batch para operación atómica
      const batch = writeBatch(db);
      
      // Registrar movimiento
      const movimientosRef = collection(db, "caja", idCaja, "movimientos");
      const movimientoData = {
        ...movimiento,
        fecha: serverTimestamp(),
        monto: monto,
        usuario: "usuario_actual" // Reemplazar con usuario real
      };
      const newMovRef = doc(movimientosRef);
      batch.set(newMovRef, movimientoData);
      
      // Actualizar saldo en caja
      batch.update(cajaRef, {
        saldoActual: nuevoSaldo,
        ultimaActualizacion: serverTimestamp()
      });
  
      await batch.commit();
      return newMovRef.id;
    } catch (error) {
      console.error("Error detallado al registrar movimiento:", {
        error,
        idCaja,
        movimiento
      });
      throw error;
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