# Dashboard de producción — diseño

Fecha: 2026-09-13
Estado: aprobado, pendiente de plan de implementación

## Problema

Rubén produce encargos que entran por tres vías distintas: pedidos de la tienda,
ventas cerradas por WhatsApp y encargos presenciales en el taller. No tiene ninguna
vista que junte las tres, ni forma de saber cuánto trabajo tiene comprometido para un
día. El riesgo concreto es aceptar más de lo que cabe y no entregar a tiempo.

Necesita abrir una pantalla por la mañana y ver qué toca hoy, qué va atrasado, y si
el día le cabe.

## Alcance

**Dentro:** vista diaria de trabajo, carga por día frente a la jornada, avisos de
sobrecarga y de plazo, tabla de tiempos por tipo de trabajo, alta de encargos de
taller.

**Fuera:** planificación automática (repartir trabajos por días), control de stock de
materiales, fichaje de horas reales, avisos al cliente.

El sistema **muestra y avisa**; no decide el orden del día.

## Enfoque elegido

Los trabajos son las líneas de pedido existentes. No se crea una colección de
`jobs` paralela.

Se descartó una colección separada porque el modo de fallo más probable no es que se
rompa, sino que se desincronice en silencio: un pedido cancelado cuyo trabajo sigue
vivo hace que se produzca algo que ya nadie quiere. Con las líneas de pedido como
única fuente, ese fallo no existe.

Los encargos presenciales se crean como pedidos con `source: 'taller'`. Es el mismo
patrón que ya usan las ventas de WhatsApp, que entran por
`src/pages/api/whatsapp-order.ts` desde la app de facturación.

## Modelo de datos

### Colección nueva: `production_times`

Tabla de tiempos por tipo de trabajo. Se configura una vez y se mantiene a mano.

| Campo             | Tipo    | Descripción                                  |
| ----------------- | ------- | -------------------------------------------- |
| `nombre`          | string  | "Camiseta DTF", "Figura 3D", "Hoja pegatinas" |
| `minutosPersona`  | number  | Minutos de trabajo humano **por unidad**      |
| `minutosMaquina`  | number  | Minutos de máquina desatendida por unidad     |
| `minutosPreparar` | number  | Montaje, **una sola vez por línea de pedido** |
| `activo`          | boolean | Los inactivos no se ofrecen al asignar        |

El campo `minutosPreparar` existe porque diez camisetas no cuestan diez veces una
camiseta: hay un montaje que se paga una vez. Sin él, el cálculo sobreestima los lotes
grandes y subestima los pequeños.

**Decisión:** el montaje se cuenta una vez **por línea de pedido**, no una por día.
Si en un mismo día hay dos pedidos de camisetas, se cuentan dos montajes aunque en la
práctica se puedan aprovechar. Es el cálculo pesimista, elegido a propósito: el
objetivo declarado es no comprometerse de más, así que es preferible mostrar menos
hueco del real que más.

### Campos nuevos en `OrderItem`

Todos opcionales. Los pedidos existentes siguen siendo válidos sin tocarlos.

| Campo               | Tipo      | Descripción                                       |
| ------------------- | --------- | ------------------------------------------------- |
| `productionTypeId`  | string    | Referencia a `production_times`                   |
| `personMinutes`     | number    | Calculado al asignar el tipo; editable a mano     |
| `machineMinutes`    | number    | Igual                                             |
| `productionDueDate` | Timestamp | Fecha límite de producción de esta línea          |

`personMinutes` y `machineMinutes` se **copian** al asignar el tipo en vez de leerse
siempre de la tabla. Así, cambiar un tiempo en la tabla no reescribe la carga de
trabajos ya planificados, y un encargo atípico se puede ajustar sin tocar la tabla.

### Campos nuevos en la orden

| Campo          | Tipo                                | Descripción                    |
| -------------- | ----------------------------------- | ------------------------------ |
| `promisedDate` | Timestamp                           | Cuándo se le prometió al cliente |
| `deliveryMode` | `'pickup' \| 'local' \| 'island'`   | Determina los días de transporte |

**No se reutiliza `estimatedDelivery`**, que ya existe en el modelo: significa "cuándo
lo entregará el transportista" y se alimenta del seguimiento. Son dos conceptos
distintos y mezclarlos dejaría dos fechas sin saber cuál manda.

### Ajustes: `system/productionSettings`

| Campo            | Ejemplo                                | Descripción              |
| ---------------- | -------------------------------------- | ------------------------ |
| `workdayMinutes` | 420                                    | Jornada en minutos       |
| `workdays`       | `[1,2,3,4,5]`                          | Días laborables (0 = do) |
| `transportDays`  | `{ pickup: 0, local: 1, island: 2 }`   | Días de transporte       |

## Cálculo

Tres funciones puras, sin acceso a Firestore, en `src/lib/production/`:

**`calcularFechaLimite(promisedDate, deliveryMode, settings) → Date`**
Resta los días de transporte del modo de entrega, saltando los días no laborables.

**`calcularCargaDiaria(items, settings) → Map<fecha, minutos>`**
Suma los `personMinutes` de las líneas no terminadas, agrupando por su fecha límite.
Los `machineMinutes` **no** entran en esta suma: la máquina trabaja sola.

**`calcularHoraTopeMaquina(item, ahora) → Date | null`**
Si una línea tiene `machineMinutes`, devuelve la hora límite para arrancar la máquina
y llegar a su fecha. `null` si no tiene tiempo de máquina o si ya no llega.

## Pantalla

Ruta `/admin/produccion`, componente `AdminProductionPanel.tsx`, siguiendo el patrón
del resto del admin (una página `.astro` que monta un componente React).

De arriba abajo:

1. **Cabecera** — fecha, número de trabajos, carga del día frente a la jornada, con
   barra de progreso
2. **Atrasado** — lo que venció y no está listo, en rojo, primero de todo
3. **Hoy** — lista de líneas con casilla de estado, tiempos desglosados y fecha
4. **Próximos días** — franja con la carga de cada día; en rojo los que pasan de jornada
5. **Bandejas** — «sin estimar» y «sin fecha»
6. **Botón** — nuevo encargo de taller

### Comportamiento

La casilla **avanza** el estado en vez de completarlo: `pending` → `in_production` →
`ready`. Usa el endpoint existente `src/pages/api/admin/update-item-status.ts`. Al
llegar a `ready`, la línea sale de la carga.

El aviso de máquina («arranca antes de las 12») aparece solo en líneas con
`machineMinutes` cuya hora tope cae en el día en curso.

## Casos límite

| Situación                          | Comportamiento                                       |
| ---------------------------------- | ---------------------------------------------------- |
| Línea sin `productionTypeId`       | Va a «sin estimar». No suma a la carga, pero el contador está a la vista |
| Pedido sin `promisedDate`          | Va a «sin fecha». No se le inventa una                |
| Pedido cancelado o anulado         | Fuera del panel                                       |
| Línea en `ready` o `shipped`       | Fuera de la carga                                     |
| Fecha límite ya pasada             | Sección «atrasado», arriba del todo                   |

La regla detrás de las dos bandejas: lo que no se puede calcular se muestra como
pendiente de datos, nunca se omite. Un dashboard que esconde trabajo sin estimar dice
que hay 5 h de carga cuando hay 7, y eso es peor que no tener dashboard.

## Pruebas

Las tres funciones de cálculo llevan tests unitarios en vitest, que el proyecto ya
tiene configurado (`npm run test:run`). Casos mínimos:

- Fecha límite saltando fin de semana
- Fecha límite con `pickup` (cero días de transporte)
- Carga que agrupa varias líneas en el mismo día
- Carga que ignora líneas terminadas y líneas sin estimar
- Montaje contado una vez por línea, no por unidad
- Hora tope de máquina que no llega a tiempo → `null`

La pantalla se comprueba a ojo.

## Orden de implementación sugerido

1. Tipos y funciones de cálculo, con sus tests
2. Colección `production_times` y su pantalla de mantenimiento
3. Asignación de tipo por defecto en el producto, herencia en la línea
4. Panel de producción (lectura)
5. Casilla de estado y alta de encargo de taller
