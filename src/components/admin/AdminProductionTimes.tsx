import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { formatearMinutos, calcularMinutosLinea } from '../../lib/production/calculations';
import {
  borrarTipoProduccion,
  cargarAjustesProduccion,
  cargarTiposProduccion,
  guardarAjustesProduccion,
  guardarTipoProduccion,
} from '../../lib/production/data';
import {
  DEFAULT_PRODUCTION_SETTINGS,
  DELIVERY_MODE_LABELS,
  DELIVERY_MODES,
  type ProductionSettings,
  type ProductionTime,
} from '../../lib/production/types';

const TIPO_VACIO: Omit<ProductionTime, 'id'> = {
  nombre: '',
  minutosPersona: 0,
  minutosMaquina: 0,
  minutosPreparar: 0,
  activo: true,
};

const DIAS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa'];

export default function AdminProductionTimes() {
  const { user, loading: authLoading } = useAuth();
  const [tipos, setTipos] = useState<ProductionTime[]>([]);
  const [settings, setSettings] = useState<ProductionSettings>(DEFAULT_PRODUCTION_SETTINGS);
  const [borrador, setBorrador] = useState<Omit<ProductionTime, 'id'> & { id?: string }>({
    ...TIPO_VACIO,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaTipos, ajustes] = await Promise.all([
        cargarTiposProduccion(),
        cargarAjustesProduccion(),
      ]);
      setTipos(listaTipos);
      setSettings(ajustes);
    } catch (err) {
      logger.error('[produccion] No se pudieron cargar los tiempos', err);
      notify.error('No se pudieron cargar los tiempos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void cargar();
  }, [authLoading, user, cargar]);

  const guardarTipo = async () => {
    if (!borrador.nombre.trim()) {
      notify.error('Ponle un nombre al tipo de trabajo');
      return;
    }
    setGuardando(true);
    try {
      await guardarTipoProduccion(borrador);
      setBorrador({ ...TIPO_VACIO });
      await cargar();
      notify.success('Tipo guardado');
    } catch (err) {
      logger.error('[produccion] No se pudo guardar el tipo', err);
      notify.error('No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (tipo: ProductionTime) => {
    if (!window.confirm(`¿Borrar «${tipo.nombre}»? Los trabajos ya estimados conservan sus minutos.`))
      return;
    try {
      await borrarTipoProduccion(tipo.id);
      await cargar();
    } catch (err) {
      logger.error('[produccion] No se pudo borrar el tipo', err);
      notify.error('No se pudo borrar');
    }
  };

  const guardarAjustes = async (siguientes: ProductionSettings) => {
    setSettings(siguientes);
    try {
      await guardarAjustesProduccion(siguientes);
    } catch (err) {
      logger.error('[produccion] No se pudieron guardar los ajustes', err);
      notify.error('No se pudieron guardar los ajustes');
    }
  };

  if (authLoading || cargando) return <p className="p-8 text-gray-500">Cargando…</p>;

  // Vista previa con diez unidades: es donde se ve que el montaje solo se paga una vez.
  const ejemplo = calcularMinutosLinea(borrador, 10);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Tiempos y jornada</h1>
        <p className="text-sm text-gray-500">
          De aquí salen los minutos que el panel de producción asigna a cada trabajo.
        </p>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Tipos de trabajo</h2>

        {tipos.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">
            Aún no hay ninguno. Crea al menos uno para poder estimar trabajos.
          </p>
        ) : (
          <div className="mb-4">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {tipo.nombre}
                    {!tipo.activo && <span className="text-gray-400"> · inactivo</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tipo.minutosPersona} min/ud · montaje {tipo.minutosPreparar} min
                    {tipo.minutosMaquina > 0 ? ` · máquina ${tipo.minutosMaquina} min/ud` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-700 underline"
                  onClick={() => setBorrador({ ...tipo })}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="text-sm text-red-600 underline"
                  onClick={() => void borrar(tipo)}
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {borrador.id ? 'Editar tipo' : 'Nuevo tipo'}
          </p>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Camiseta DTF"
            value={borrador.nombre}
            onChange={(evento) => setBorrador({ ...borrador, nombre: evento.target.value })}
            aria-label="Nombre del tipo de trabajo"
          />
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['minutosPersona', 'Min. tuyos por unidad'],
                ['minutosPreparar', 'Montaje (una vez)'],
                ['minutosMaquina', 'Min. de máquina por unidad'],
              ] as const
            ).map(([campo, etiqueta]) => (
              <label key={campo} className="text-xs text-gray-600">
                {etiqueta}
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                  value={borrador[campo]}
                  onChange={(evento) =>
                    setBorrador({ ...borrador, [campo]: Number(evento.target.value) || 0 })
                  }
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Un lote de 10 costaría {formatearMinutos(ejemplo.personMinutes)} tuyos
            {ejemplo.machineMinutes > 0
              ? ` y ${formatearMinutos(ejemplo.machineMinutes)} de máquina`
              : ''}
            .
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={borrador.activo}
              onChange={(evento) => setBorrador({ ...borrador, activo: evento.target.checked })}
            />
            Activo
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void guardarTipo()}
              disabled={guardando}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
            >
              {borrador.id ? 'Guardar cambios' : 'Añadir tipo'}
            </button>
            {borrador.id && (
              <button
                type="button"
                onClick={() => setBorrador({ ...TIPO_VACIO })}
                className="text-sm text-gray-600 px-3"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">Tu jornada</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-xs text-gray-600">
            Horas al día
            <input
              type="number"
              min="1"
              max="16"
              step="0.5"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
              value={settings.workdayMinutes / 60}
              onChange={(evento) =>
                void guardarAjustes({
                  ...settings,
                  workdayMinutes: Math.round((Number(evento.target.value) || 0) * 60),
                })
              }
            />
          </label>
          <label className="text-xs text-gray-600">
            Hora a la que cierras
            <input
              type="number"
              min="0"
              max="23"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
              value={settings.workdayEndHour}
              onChange={(evento) =>
                void guardarAjustes({
                  ...settings,
                  workdayEndHour: Number(evento.target.value) || 0,
                })
              }
            />
          </label>
        </div>

        <div>
          <p className="text-xs text-gray-600 mb-2">Días que trabajas</p>
          <div className="flex gap-2">
            {DIAS.map((etiqueta, indice) => {
              const activo = settings.workdays.includes(indice);
              return (
                <button
                  key={etiqueta}
                  type="button"
                  className={`w-10 h-10 rounded text-sm ${
                    activo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() =>
                    void guardarAjustes({
                      ...settings,
                      workdays: activo
                        ? settings.workdays.filter((dia) => dia !== indice)
                        : [...settings.workdays, indice].sort(),
                    })
                  }
                  aria-pressed={activo}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>
          {settings.workdays.length === 0 && (
            <p className="text-xs text-red-700 mt-2">
              Sin días laborables no se puede calcular ninguna fecha límite.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-600 mb-2">Días de transporte</p>
          <div className="grid grid-cols-3 gap-3">
            {DELIVERY_MODES.map((modo) => (
              <label key={modo} className="text-xs text-gray-600">
                {DELIVERY_MODE_LABELS[modo]}
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                  value={settings.transportDays[modo]}
                  onChange={(evento) =>
                    void guardarAjustes({
                      ...settings,
                      transportDays: {
                        ...settings.transportDays,
                        [modo]: Number(evento.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <a href="/admin/produccion" className="text-sm text-blue-700 underline">
        Volver al panel de producción
      </a>
    </div>
  );
}
