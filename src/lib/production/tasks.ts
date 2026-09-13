/**
 * Tareas manuales de la semana.
 *
 * Colección propia, sin relación con los pedidos: Rubén escribe lo que tiene que
 * hacer y en qué día. La versión automática vendrá después, cuando se vea cómo
 * usa esto de verdad.
 *
 * Los campos `createdAt` y `hechoAt` no los lee la pantalla: están para poder
 * mirar más adelante cuánto tarda de verdad lo que planifica.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface WeekTask {
  id: string;
  texto: string;
  /** Día al que está asignada, `YYYY-MM-DD` en horario local. */
  fecha: string;
  /** Estimación propia. 0 significa que no la puso. */
  minutos: number;
  hecho: boolean;
}

const COLECCION = 'production_tasks';

export async function cargarTareas(desde: string, hasta: string): Promise<WeekTask[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLECCION),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
      orderBy('fecha')
    )
  );
  return snapshot.docs.map((documento) => {
    const datos = documento.data();
    return {
      id: documento.id,
      texto: String(datos.texto ?? ''),
      fecha: String(datos.fecha ?? desde),
      minutos: Number(datos.minutos) || 0,
      hecho: datos.hecho === true,
    };
  });
}

export async function crearTarea(texto: string, fecha: string, minutos: number): Promise<string> {
  const referencia = await addDoc(collection(db, COLECCION), {
    texto: texto.trim().slice(0, 300),
    fecha,
    minutos: Math.max(0, Math.round(minutos) || 0),
    hecho: false,
    createdAt: Timestamp.now(),
    hechoAt: null,
  });
  return referencia.id;
}

export async function actualizarTarea(id: string, cambios: Partial<Omit<WeekTask, 'id'>>) {
  const datos: Record<string, unknown> = {};
  if (cambios.texto !== undefined) datos.texto = cambios.texto.trim().slice(0, 300);
  if (cambios.fecha !== undefined) datos.fecha = cambios.fecha;
  if (cambios.minutos !== undefined) datos.minutos = Math.max(0, Math.round(cambios.minutos) || 0);
  if (cambios.hecho !== undefined) {
    datos.hecho = cambios.hecho;
    // Cuándo se terminó de verdad, frente a cuándo se planificó.
    datos.hechoAt = cambios.hecho ? Timestamp.now() : null;
  }
  if (Object.keys(datos).length === 0) return;
  await updateDoc(doc(db, COLECCION, id), datos);
}

export async function borrarTarea(id: string) {
  await deleteDoc(doc(db, COLECCION, id));
}
