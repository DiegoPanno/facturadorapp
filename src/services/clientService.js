// services/clienteService.js
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

// Función para guardar un cliente
export const guardarCliente = async (cliente) => {
  try {
    // Verificar que los datos requeridos estén presentes
    if (!cliente.nombre || !cliente.cuit) {
      throw new Error("Nombre y CUIT son campos requeridos");
    }

    const clienteConLowercase = {
      ...cliente,
      nombre_lowercase: cliente.nombre.toLowerCase(),
      createdAt: new Date() // Agregar marca de tiempo
    };

    const docRef = await addDoc(collection(db, "clientes"), clienteConLowercase);
    return { id: docRef.id, ...clienteConLowercase };
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    throw error;
  }
};





