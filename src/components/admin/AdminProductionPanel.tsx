import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  agruparLineas,
  calcularCargaDiaria,
  calcularHoraTopeMaquina,
  calcularMinutosLinea,
  claveDia,
  formatearMinutos,
  inicioDelDia,
  sumarDias,
} from '../../lib/production/calculations';
import {
  cargarAjustesProduccion,
  cargarLineasProduccion,
  cargarTiposProduccion,
} from '../../lib/production/data';
import {
  DEFAULT_PRODUCTION_SETTINGS,
  type ProductionLine,
  type ProductionSettings,
  type ProductionStatus,
  type ProductionTime,
} from '../../lib/production/types';

const SIGUIENTE_ESTADO: Record<ProductionStatus, ProductionStatus> = {
  pending: 'in_production',
  in_production: 'ready',
  ready: 'pending',
  shipped: 'shipped',
};

const ETIQUETA_ESTADO: Record<ProductionStatus, string> = {
  pending: 'Pendiente',
  in_production: 'En marcha',
  ready: 'Listo',
  shipped: 'Enviado',
};

const DIAS_VISTA = 6;

const nombreDia = (fecha: Date) =>
  fecha.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');

const fechaLarga = (fecha: Date) =>
  fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const hora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export default function AdminProductionPanel() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ProductionSettings>(DEFAULT_PRODUCTION_SETTINGS);
  const [tipos, setTipos] = useState<ProductionTime[]>([]);
  const [lineas, setLineas] = useState<ProductionLine[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  // Una sola referencia temporal por render: si cambiara a mitad del cálculo,
  // una línea podría contarse como de hoy y como atrasada a la vez.
  const [ahora] = useState(() => new Date());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const ajustes = await cargarAjustesProduccion();
      const [listaTipos, listaLineas] = await Promise.all([
        cargarTiposProduccion(),
        cargarLineasProduccion(ajustes),
      ]);
      setSettings(ajustes);
      setTipos(listaTipos);
      setLineas(listaLineas);
    } catch (err) {
      logger.error('[produccion] No se pudieron cargar los datos', err);
      setError('No se pudieron cargar los trabajos. Recarga la página.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void cargar();
  }, [authLoading, user, cargar]);

  const grupos = useMemo(() => agruparLineas(lineas, ahora), [lineas, ahora]);
  const carga = useMemo(() => calcularCargaDiaria(lineas), [lineas]);

  // Lo atrasado sigue siendo trabajo que hay que hacer hoy: cuenta en la carga.
  const minutosHoy = useMemo(
    () =>
      [...grupos.atrasadas, ...grupos.hoy].reduce(
        (suma, linea) => suma + (linea.personMinutes ?? 0),
        0
      ),
    [grupos]
  );

  const proximosDias = useMemo(() => {
    const base = inicioDelDia(ahora);
    return Array.from({ length: DIAS_VISTA }, (_, indice) => {
      const fecha = sumarDias(base, indice + 1);
      return { fecha, minutos: carga.get(claveDia(fecha)) ?? 0 };
    });
  }, [ahora, carga]);

  const porcentaje =
    settings.workdayMinutes > 0
      ? Math.min(100, Math.round((minutosHoy / settings.workdayMinutes) * 100))
      : 0;
  const sobrecargado = minutosHoy > settings.workdayMinutes;

  const llamarApi = useCallback(
    async (ruta: string, cuerpo: unknown) => {
      if (!user) throw new Error('Sesión no iniciada');
      const token = await user.getIdToken();
      const respuesta = await fetch(ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuerpo),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'La operación no se completó');
      return datos;
    },
    [user]
  );

  const clave = (linea: ProductionLine) => `${linea.orderId}:${linea.itemIndex}`;

  const avanzarEstado = async (linea: ProductionLine) => {
    const siguiente = SIGUIENTE_ESTADO[linea.status];
    const anterior = linea.status;
    setGuardando(clave(linea));
    // Optimista: el taller va rápido y esperar al servidor en cada casilla se nota.
    setLineas((previas) =>
      previas.map((otra) =>
        clave(otra) === clave(linea) ? { ...otra, status: siguiente } : otra
      )
    );
    try {
      await llamarApi('/api/admin/update-item-status', {
        orderId: linea.orderId,
        itemIndex: linea.itemIndex,
        status: siguiente,
      });
    } catch (err) {
      setLineas((previas) =>
        previas.map((otra) =>
          clave(otra) === clave(linea) ? { ...otra, status: anterior } : otra
        )
      );
      notify.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setGuardando(null);
    }
  };

  const asignarTipo = async (linea: ProductionLine, tipoId: string) => {
    const tipo = tipos.find((candidato) => candidato.id === tipoId);
    if (!tipo) return;
    const minutos = calcularMinutosLinea(tipo, linea.quantity);
    setGuardando(clave(linea));
    try {
      await llamarApi('/api/admin/update-production', {
        orderId: linea.orderId,
        item: {
          itemIndex: linea.itemIndex,
          productionTypeId: tipo.id,
          personMinutes: minutos.personMinutes,
          machineMinutes: minutos.machineMinutes,
        },
      });
      setLineas((previas) =>
        previas.map((otra) =>
          clave(otra) === clave(linea)
            ? { ...otra, productionTypeId: tipo.id, ...minutos }
            : otra
        )
      );
      notify.success(`${tipo.nombre}: ${formatearMinutos(minutos.personMinutes)}`);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo asignar el tipo');
    } finally {
      setGuardando(null);
    }
  };

  const ponerFecha = async (linea: ProductionLine, valor: string) => {
    if (!valor) return;
    setGuardando(clave(linea));
    try {
      const fecha = new Date(`${valor}T12:00:00`);
      await llamarApi('/api/admin/update-production', {
        orderId: linea.orderId,
        order: { promisedDate: fecha.toISOString() },
      });
      await cargar();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo guardar la fecha');
    } finally {
      setGuardando(null);
    }
  };

  if (authLoading || cargando) {
    return <p className="p-8 text-gray-500">Cargando trabajos…</p>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      </div>
    );
  }

  const Linea = ({ linea, atrasada = false }: { linea: ProductionLine; atrasada?: boolean }) => {
    const topeMaquina = calcularHoraTopeMaquina(linea.machineMinutes, linea.dueDate, settings);
    const maquinaJusta = topeMaquina !== null && claveDia(topeMaquina) === claveDia(ahora);
    const maquinaTarde = topeMaquina !== null && topeMaquina.getTime() < ahora.getTime();
    const ocupada = guardando === clave(linea);

    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
        <input
          type="checkbox"
          className="w-4 h-4 shrink-0"
          checked={linea.status !== 'pending'}
          disabled={ocupada}
          onChange={() => void avanzarEstado(linea)}
          aria-label={`Avanzar ${linea.productName} a ${ETIQUETA_ESTADO[SIGUIENTE_ESTADO[linea.status]]}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">
            {linea.quantity > 1 ? `${linea.quantity} × ` : ''}
            {linea.productName}
            <span className="text-gray-400"> · {linea.clientName}</span>
          </p>
          <p className="text-xs text-gray-500">
            {formatearMinutos(linea.personMinutes ?? 0)}
            {linea.machineMinutes ? ` · máquina ${formatearMinutos(linea.machineMinutes)}` : ''}
            {linea.status !== 'pending' ? ` · ${ETIQUETA_ESTADO[linea.status]}` : ''}
          </p>
        </div>
        {maquinaTarde && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded shrink-0">
            la máquina ya no llega
          </span>
        )}
        {!maquinaTarde && maquinaJusta && topeMaquina && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded shrink-0">
            arranca antes de las {hora(topeMaquina)}
          </span>
        )}
        <span
          className={`text-xs shrink-0 ${atrasada ? 'text-red-700' : 'text-gray-500'}`}
        >
          {linea.dueDate ? claveDia(linea.dueDate).slice(5).split('-').reverse().join('/') : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Producción</h1>
            <p className="text-sm text-gray-500 capitalize">{fechaLarga(ahora)}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-semibold ${sobrecargado ? 'text-red-700' : 'text-gray-900'}`}>
              {formatearMinutos(minutosHoy)}
            </p>
            <p className="text-sm text-gray-500">
              de {formatearMinutos(settings.workdayMinutes)} de jornada
            </p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded overflow-hidden mt-3">
          <div
            className={`h-full ${sobrecargado ? 'bg-red-600' : 'bg-green-600'}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        {sobrecargado && (
          <p className="text-sm text-red-700 mt-2">
            Hoy tienes {formatearMinutos(minutosHoy - settings.workdayMinutes)} más de lo que cabe
            en tu jornada.
          </p>
        )}
      </header>

      {grupos.atrasadas.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-red-800 mb-1">
            Atrasado · {grupos.atrasadas.length}
          </h2>
          {grupos.atrasadas.map((linea) => (
            <Linea key={clave(linea)} linea={linea} atrasada />
          ))}
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Hoy · {grupos.hoy.length}</h2>
        {grupos.hoy.length === 0 ? (
          <p className="text-sm text-gray-500 py-3">Nada vence hoy.</p>
        ) : (
          grupos.hoy.map((linea) => <Linea key={clave(linea)} linea={linea} />)
        )}
      </section>

      <section>
        <h2 className="text-sm text-gray-500 mb-2">Próximos días</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {proximosDias.map(({ fecha, minutos }) => {
            const pasado = minutos > settings.workdayMinutes;
            return (
              <div
                key={claveDia(fecha)}
                className={`rounded-lg p-3 text-center ${pasado ? 'bg-red-50' : 'bg-gray-50'}`}
              >
                <p className={`text-xs ${pasado ? 'text-red-700' : 'text-gray-500'}`}>
                  {nombreDia(fecha)} {fecha.getDate()}
                </p>
                <p
                  className={`text-base font-medium mt-1 ${pasado ? 'text-red-700' : 'text-gray-900'}`}
                >
                  {minutos === 0 ? '—' : formatearMinutos(minutos)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {grupos.sinEstimar.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-amber-800">
            Sin estimar · {grupos.sinEstimar.length}
          </h2>
          <p className="text-xs text-amber-700 mb-2">
            No suman a la carga del día. Asígnales un tipo para que cuenten.
          </p>
          {grupos.sinEstimar.map((linea) => (
            <div
              key={clave(linea)}
              className="flex items-center gap-3 py-2 border-b border-amber-100 last:border-0"
            >
              <p className="text-sm flex-1 min-w-0 truncate">
                {linea.quantity > 1 ? `${linea.quantity} × ` : ''}
                {linea.productName}
                <span className="text-gray-500"> · {linea.clientName}</span>
              </p>
              <select
                className="text-sm border border-amber-300 rounded px-2 py-1 bg-white"
                defaultValue=""
                disabled={guardando === clave(linea) || tipos.length === 0}
                onChange={(evento) => void asignarTipo(linea, evento.target.value)}
                aria-label={`Tipo de trabajo para ${linea.productName}`}
              >
                <option value="" disabled>
                  {tipos.length === 0 ? 'Sin tipos configurados' : 'Elige tipo'}
                </option>
                {tipos
                  .filter((tipo) => tipo.activo)
                  .map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
              </select>
            </div>
          ))}
          {tipos.length === 0 && (
            <a href="/admin/produccion/tiempos" className="text-sm text-amber-800 underline">
              Configura primero los tipos de trabajo
            </a>
          )}
        </section>
      )}

      {grupos.sinFecha.length > 0 && (
        <section className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-700">
            Sin fecha · {grupos.sinFecha.length}
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Nadie les puso fecha prometida, así que no aparecen en ningún día.
          </p>
          {grupos.sinFecha.map((linea) => (
            <div
              key={clave(linea)}
              className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0"
            >
              <p className="text-sm flex-1 min-w-0 truncate">
                {linea.productName}
                <span className="text-gray-500"> · {linea.clientName}</span>
              </p>
              <input
                type="date"
                className="text-sm border border-gray-300 rounded px-2 py-1"
                disabled={guardando === clave(linea)}
                onChange={(evento) => void ponerFecha(linea, evento.target.value)}
                aria-label={`Fecha prometida para ${linea.productName}`}
              />
            </div>
          ))}
        </section>
      )}

      <footer className="flex items-center justify-between text-sm">
        <a href="/admin/produccion/tiempos" className="text-blue-700 underline">
          Tiempos y jornada
        </a>
        <button
          type="button"
          onClick={() => void cargar()}
          className="text-gray-600 hover:text-gray-900"
        >
          Actualizar
        </button>
      </footer>
    </div>
  );
}
