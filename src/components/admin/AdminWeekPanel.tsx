import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { claveDia, formatearMinutos, inicioDelDia, sumarDias } from '../../lib/production/calculations';
import {
  actualizarTarea,
  borrarTarea,
  cargarTareas,
  crearTarea,
  type WeekTask,
} from '../../lib/production/tasks';

/** La jornada vive en el navegador: es una preferencia, no un dato del negocio. */
const CLAVE_JORNADA = 'imprimearte:horas-jornada';

const leerJornada = (): number => {
  try {
    const guardado = Number(window.localStorage.getItem(CLAVE_JORNADA));
    return Number.isFinite(guardado) && guardado > 0 ? guardado : 7;
  } catch {
    return 7;
  }
};

/** Lunes de la semana que contiene esa fecha. */
const lunesDe = (fecha: Date): Date => {
  const base = inicioDelDia(fecha);
  const desplazamiento = (base.getDay() + 6) % 7;
  return sumarDias(base, -desplazamiento);
};

const nombreDia = (fecha: Date) =>
  fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

const rangoSemana = (lunes: Date) => {
  const domingo = sumarDias(lunes, 6);
  const mismoMes = lunes.getMonth() === domingo.getMonth();
  const opciones: Intl.DateTimeFormatOptions = mismoMes
    ? { day: 'numeric' }
    : { day: 'numeric', month: 'short' };
  return `${lunes.toLocaleDateString('es-ES', opciones)} – ${domingo.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })}`;
};

export default function AdminWeekPanel() {
  const { user, loading: authLoading } = useAuth();
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [tareas, setTareas] = useState<WeekTask[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [jornada, setJornada] = useState(7);

  const [texto, setTexto] = useState('');
  const [minutos, setMinutos] = useState('');
  const [dia, setDia] = useState(() => claveDia(new Date()));
  const [anadiendo, setAnadiendo] = useState(false);

  const hoy = useMemo(() => claveDia(new Date()), []);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice)),
    [lunes]
  );

  useEffect(() => setJornada(leerJornada()), []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const desde = claveDia(lunes);
      const hasta = claveDia(sumarDias(lunes, 6));
      setTareas(await cargarTareas(desde, hasta));
    } catch (err) {
      logger.error('[semana] No se pudieron cargar las tareas', err);
      setError(
        'No se pudieron cargar las tareas. Si acabas de desplegar, comprueba que la regla de Firestore para production_tasks está publicada.'
      );
    } finally {
      setCargando(false);
    }
  }, [lunes]);

  useEffect(() => {
    if (!authLoading && user) void cargar();
  }, [authLoading, user, cargar]);

  const guardarJornada = (horas: number) => {
    setJornada(horas);
    try {
      window.localStorage.setItem(CLAVE_JORNADA, String(horas));
    } catch {
      // Navegador sin almacenamiento: se queda en memoria y no pasa nada.
    }
  };

  const anadir = async () => {
    if (!texto.trim()) {
      notify.error('Escribe qué hay que hacer');
      return;
    }
    setAnadiendo(true);
    try {
      const id = await crearTarea(texto, dia, Number(minutos) || 0);
      setTareas((previas) => [
        ...previas,
        { id, texto: texto.trim(), fecha: dia, minutos: Number(minutos) || 0, hecho: false },
      ]);
      setTexto('');
      setMinutos('');
    } catch (err) {
      logger.error('[semana] No se pudo crear la tarea', err);
      notify.error('No se pudo guardar');
    } finally {
      setAnadiendo(false);
    }
  };

  // Optimista en los tres casos: el taller va rápido y esperar al servidor se nota.
  const cambiar = async (tarea: WeekTask, cambios: Partial<Omit<WeekTask, 'id'>>) => {
    const previas = tareas;
    setTareas((actuales) =>
      actuales.map((otra) => (otra.id === tarea.id ? { ...otra, ...cambios } : otra))
    );
    try {
      await actualizarTarea(tarea.id, cambios);
    } catch (err) {
      setTareas(previas);
      logger.error('[semana] No se pudo actualizar', err);
      notify.error('No se pudo guardar el cambio');
    }
  };

  const borrar = async (tarea: WeekTask) => {
    const previas = tareas;
    setTareas((actuales) => actuales.filter((otra) => otra.id !== tarea.id));
    try {
      await borrarTarea(tarea.id);
    } catch (err) {
      setTareas(previas);
      notify.error('No se pudo borrar');
    }
  };

  if (authLoading || cargando) return <p className="p-8 text-gray-500">Cargando la semana…</p>;

  const jornadaMinutos = jornada * 60;
  const totalSemana = tareas.filter((t) => !t.hecho).reduce((suma, t) => suma + t.minutos, 0);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mi semana</h1>
          <p className="text-sm text-gray-500">
            {rangoSemana(lunes)} · {formatearMinutos(totalSemana)} por hacer
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLunes(sumarDias(lunes, -7))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setLunes(lunesDe(new Date()))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Esta semana
          </button>
          <button
            type="button"
            onClick={() => setLunes(sumarDias(lunes, 7))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-3 flex gap-2 flex-wrap items-center">
        <input
          type="text"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') void anadir();
          }}
          placeholder="10 camisetas Bar Central"
          className="flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2 text-sm"
          aria-label="Qué hay que hacer"
        />
        <select
          value={dia}
          onChange={(evento) => setDia(evento.target.value)}
          className="border border-gray-300 rounded px-2 py-2 text-sm"
          aria-label="Día"
        >
          {dias.map((fecha) => (
            <option key={claveDia(fecha)} value={claveDia(fecha)}>
              {nombreDia(fecha)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={minutos}
          onChange={(evento) => setMinutos(evento.target.value)}
          placeholder="min"
          className="w-20 border border-gray-300 rounded px-2 py-2 text-sm"
          aria-label="Minutos estimados"
        />
        <button
          type="button"
          onClick={() => void anadir()}
          disabled={anadiendo}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      {dias.map((fecha) => {
        const clave = claveDia(fecha);
        const delDia = tareas.filter((tarea) => tarea.fecha === clave);
        const pendientes = delDia.filter((tarea) => !tarea.hecho);
        const minutosDia = pendientes.reduce((suma, tarea) => suma + tarea.minutos, 0);
        const lleno = minutosDia > jornadaMinutos;
        const esHoy = clave === hoy;

        return (
          <section
            key={clave}
            className={`border rounded-xl ${esHoy ? 'border-gray-900' : 'border-gray-200'} bg-white`}
          >
            <div className="flex items-baseline justify-between px-4 py-2 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-800 capitalize">
                {nombreDia(fecha)}
                {esHoy && <span className="text-gray-500 font-normal"> · hoy</span>}
              </h2>
              <span className={`text-sm ${lleno ? 'text-red-700' : 'text-gray-500'}`}>
                {minutosDia > 0 ? formatearMinutos(minutosDia) : '—'}
                {lleno && ' · pasado'}
              </span>
            </div>

            {delDia.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">Nada</p>
            ) : (
              <div className="px-4">
                {delDia.map((tarea) => (
                  <div
                    key={tarea.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={tarea.hecho}
                      onChange={() => void cambiar(tarea, { hecho: !tarea.hecho })}
                      className="w-4 h-4 shrink-0"
                      aria-label={`Marcar ${tarea.texto}`}
                    />
                    <span
                      className={`flex-1 text-sm min-w-0 break-words ${
                        tarea.hecho ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {tarea.texto}
                    </span>
                    {tarea.minutos > 0 && (
                      <span className="text-xs text-gray-500 shrink-0">
                        {formatearMinutos(tarea.minutos)}
                      </span>
                    )}
                    <select
                      value={tarea.fecha}
                      onChange={(evento) => void cambiar(tarea, { fecha: evento.target.value })}
                      className="text-xs border border-gray-200 rounded px-1 py-1 text-gray-600"
                      aria-label={`Mover ${tarea.texto} a otro día`}
                    >
                      {dias.map((otra) => (
                        <option key={claveDia(otra)} value={claveDia(otra)}>
                          {otra.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void borrar(tarea)}
                      className="text-xs text-gray-400 hover:text-red-600 shrink-0"
                      aria-label={`Borrar ${tarea.texto}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <footer className="flex items-center gap-2 text-sm text-gray-500">
        <label className="flex items-center gap-2">
          Horas al día
          <input
            type="number"
            min="1"
            max="16"
            step="0.5"
            value={jornada}
            onChange={(evento) => guardarJornada(Number(evento.target.value) || 7)}
            className="w-16 border border-gray-300 rounded px-2 py-1"
          />
        </label>
        <span className="text-gray-400">· solo para avisarte cuando un día se pasa</span>
      </footer>
    </div>
  );
}
