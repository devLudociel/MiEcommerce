# 📝 Guía de Migración: console.log → logger

## Estado Actual

- **Total de ocurrencias**: 286 console.log/error/warn en 47 archivos
- **Archivos prioritarios identificados**: 6 archivos críticos de API

## 🚀 Opción 1: Migración Automática (Recomendada)

Usa el script automatizado:

```bash
chmod +x migrate-to-logger.sh
./migrate-to-logger.sh
```

El script migrará los archivos más críticos:

- `src/pages/api/save-order.ts`
- `src/pages/api/create-payment-intent.ts`
- `src/pages/api/get-wallet-balance.ts`
- `src/pages/api/get-wallet-transactions.ts`
- `src/pages/api/stripe-webhook.ts`
- `src/lib/firebase-admin.ts`

## 🔧 Opción 2: Migración Manual

### 1. Agregar import

```typescript
import { logger } from '../../lib/logger';
```

### 2. Reemplazar console.log

```typescript
// ❌ Antes
console.log('API save-order: Solicitud recibida');
console.error('Error procesando pedido:', error);
console.warn('Saldo insuficiente');

// ✅ Después
logger.info('[API save-order] Request received');
logger.error('[API save-order] Error processing order', error);
logger.warn('[API save-order] Insufficient balance');
```

### 3. Formato recomendado

Usa el patrón `[Component] Action`:

```typescript
logger.info('[API save-order] Order saved', { orderId: '123' });
logger.error('[Wallet] Debit failed', { userId, amount, error });
```

## 📊 Archivos por Prioridad

### Alta Prioridad (APIs críticas)

- `src/pages/api/save-order.ts` - 24 ocurrencias
- `src/pages/api/create-payment-intent.ts` - 3 ocurrencias
- `src/pages/api/get-wallet-balance.ts` - 5 ocurrencias

### Media Prioridad (Componentes admin)

- `src/components/admin/AdminDashboard.tsx` - 15 ocurrencias
- `src/components/admin/AdminOrdersList.tsx` - 4 ocurrencias

### Baja Prioridad (Otros componentes)

- El resto de archivos frontend

## ✅ Checklist de Migración

Para cada archivo:

- [ ] Leer el archivo y entender el contexto
- [ ] Agregar `import { logger }` al inicio
- [ ] Reemplazar `console.log` → `logger.info` o `logger.debug`
- [ ] Reemplazar `console.error` → `logger.error`
- [ ] Reemplazar `console.warn` → `logger.warn`
- [ ] Agregar contexto `[Component]` a los mensajes
- [ ] Agregar objetos de datos donde sea relevante
- [ ] Probar que funcione: `npm run dev`
- [ ] Verificar logs en consola

## 🎯 Beneficios

Después de la migración:

- ✅ Logs desactivados automáticamente en producción
- ✅ Mejor organización con contexto y colores
- ✅ Preparado para integración con Sentry
- ✅ Performance mejorada (menos logs innecesarios)

## 📝 Notas

- El logger ya está configurado en `src/lib/logger.ts`
- En desarrollo: todos los logs visibles
- En producción: solo errores
- Puedes cambiar el nivel en runtime si necesitas

## 🔍 Encontrar Archivos Pendientes

```bash
# Ver todos los console.log restantes
grep -r "console\.(log|error|warn)" src/ --include="*.ts" --include="*.tsx"

# Contar por archivo
grep -r "console\.(log|error|warn)" src/ --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn
```
