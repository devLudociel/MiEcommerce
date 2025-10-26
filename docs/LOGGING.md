# 📊 Sistema de Logging

Sistema de logging profesional con niveles configurables por ambiente.

---

## 🎯 Características

- ✅ **Niveles de Log**: DEBUG, INFO, WARN, ERROR
- ✅ **Configuración por Ambiente**: Automático según dev/prod
- ✅ **Colores en Consola**: Mejor legibilidad
- ✅ **Timestamps**: Opcional
- ✅ **Utilidades Avanzadas**: Timer, grupos, tablas
- ✅ **Type-Safe**: Completo soporte TypeScript
- ✅ **Preparado para Sentry**: Fácil integración futura

---

## 📖 Uso Básico

### Importar el Logger

```typescript
import { logger } from '@/lib/logger';
```

### Niveles de Log

#### DEBUG - Información Detallada
Solo visible en desarrollo. Para debugging profundo.

```typescript
logger.debug('[Component] Loading data...', { userId: 123, filters: ['active'] });
```

#### INFO - Información General
Operaciones normales y flujo de la aplicación.

```typescript
logger.info('[API] Order created successfully', { orderId: 'abc123' });
```

#### WARN - Advertencias
Situaciones inesperadas pero no críticas.

```typescript
logger.warn('[Cart] localStorage quota exceeded', { size: '10MB' });
```

#### ERROR - Errores
Errores que requieren atención.

```typescript
logger.error('[Payment] Stripe error', error);
```

#### SUCCESS - Operaciones Exitosas
Para resaltar operaciones importantes completadas.

```typescript
logger.success('[Auth] User logged in successfully', { email: user.email });
```

---

## 🎨 Convenciones de Formato

### Formato de Mensajes

Usar el patrón `[ComponentName] Acción descriptiva`:

```typescript
// ✅ Bueno
logger.info('[ProductGrid] Products loaded', { count: 10 });
logger.error('[Checkout] Payment processing failed', error);
logger.debug('[CartStore] Item added to cart', { productId: '123' });

// ❌ Malo
logger.info('products loaded');  // Sin contexto
logger.error('error');  // Vago
```

### Componentes Comunes

- `[CartStore]` - Operaciones del carrito
- `[Checkout]` - Proceso de checkout
- `[Auth]` - Autenticación
- `[API]` - Llamadas a API
- `[Firebase]` - Operaciones de Firebase
- `[AdminDashboard]` - Panel de administración
- `[ProductGrid]` - Grid de productos

---

## 🚀 Utilidades Avanzadas

### Medir Tiempo de Ejecución

```typescript
logger.time('[API] Fetch products');

// ... operación costosa
const products = await fetchProducts();

logger.timeEnd('[API] Fetch products');
// Output: [API] Fetch products: 234.56ms
```

### Agrupar Logs Relacionados

```typescript
logger.group('[Checkout] Processing order', () => {
  logger.info('Validating cart items');
  logger.info('Calculating totals');
  logger.info('Creating payment intent');
});
```

### Agrupar Colapsado (menos intrusivo)

```typescript
logger.groupCollapsed('[Debug] Product details', () => {
  logger.debug('Product ID', product.id);
  logger.debug('Price', product.price);
  logger.debug('Stock', product.stock);
});
```

### Mostrar Tablas

Ideal para arrays de objetos:

```typescript
const orders = await getOrders();
logger.table(orders);
```

### Stack Trace

Para debugging profundo:

```typescript
logger.trace('[Component] Unexpected state');
```

---

## ⚙️ Configuración

### Cambiar Nivel de Log en Runtime

```typescript
import { setLogLevel, LogLevel } from '@/lib/logger';

// Solo mostrar errores
setLogLevel(LogLevel.ERROR);

// Mostrar todo
setLogLevel(LogLevel.DEBUG);

// Deshabilitar logs completamente
setLogLevel(LogLevel.NONE);
```

### Configuración Personalizada

```typescript
import { configureLogger } from '@/lib/logger';

configureLogger({
  level: LogLevel.INFO,
  enableTimestamps: true,
  enableColors: true,
  prefix: '[MY-APP]',
});
```

---

## 🌍 Comportamiento por Ambiente

### Desarrollo (`npm run dev`)
- **Nivel por Defecto**: `DEBUG` (todos los logs)
- **Timestamps**: Habilitados
- **Colores**: Habilitados
- **Prefix**: `[DEV]`

### Producción (`npm run build`)
- **Nivel por Defecto**: `ERROR` (solo errores)
- **Timestamps**: Deshabilitados
- **Colores**: Habilitados
- **Prefix**: `[PROD]`

---

## 🔧 Debugging en el Navegador

En desarrollo, el logger está disponible globalmente:

```javascript
// Abrir DevTools Console (F12)

// Ver nivel actual
window.__logger

// Cambiar nivel de log
window.__setLogLevel(LogLevel.INFO)

// Probar diferentes niveles
window.__logger.debug('Test debug');
window.__logger.info('Test info');
window.__logger.warn('Test warn');
window.__logger.error('Test error');
```

---

## 📝 Ejemplos de Uso Real

### Carrito de Compras

```typescript
// src/store/cartStore.ts
import { logger } from '@/lib/logger';

export function addToCart(item: CartItem): void {
  logger.info('[CartStore] Adding item', {
    productId: item.id,
    productName: item.name,
    quantity: item.quantity,
  });

  try {
    // ... lógica del carrito
    logger.success('[CartStore] Item added successfully');
  } catch (error) {
    logger.error('[CartStore] Failed to add item', error);
    throw error;
  }
}
```

### Proceso de Checkout

```typescript
// src/components/Checkout.tsx
import { logger } from '@/lib/logger';

async function handlePlaceOrder() {
  logger.info('[Checkout] Starting order process', { itemCount: cart.items.length });

  logger.time('[Checkout] Create order');

  try {
    const orderId = await createOrder(orderData);
    logger.timeEnd('[Checkout] Create order');

    logger.success('[Checkout] Order created', { orderId });

  } catch (error) {
    logger.error('[Checkout] Order creation failed', error);
    notify.error('Error al procesar el pedido');
  }
}
```

### Operaciones de Base de Datos

```typescript
// src/lib/firebase.ts
import { logger } from '@/lib/logger';

export async function getProducts(): Promise<Product[]> {
  logger.debug('[Firebase] Fetching products');

  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    logger.info('[Firebase] Products fetched', { count: products.length });

    if (logger.debug) {
      logger.table(products);
    }

    return products;
  } catch (error) {
    logger.error('[Firebase] Failed to fetch products', error);
    throw error;
  }
}
```

---

## 🚫 Lo Que NO Hacer

### ❌ No usar console.log directamente

```typescript
// ❌ Malo
console.log('Product loaded');

// ✅ Bueno
logger.info('[ProductDetail] Product loaded', { productId });
```

### ❌ No loggear información sensible

```typescript
// ❌ Malo - expone datos sensibles
logger.info('[Auth] User logged in', {
  email: user.email,
  password: user.password  // ¡NUNCA!
});

// ✅ Bueno
logger.info('[Auth] User logged in', {
  userId: user.id,
  email: user.email
});
```

### ❌ No loggear en loops sin límite

```typescript
// ❌ Malo - spam de logs
products.forEach(product => {
  logger.info('[Loop] Processing product', product);
});

// ✅ Bueno
logger.info('[ProductProcessor] Processing products', { count: products.length });
logger.table(products);  // O usar tabla para ver detalles
```

---

## 🔮 Futura Integración con Sentry

El sistema está preparado para integrar con Sentry en producción:

```typescript
// En logger.ts (futuro)
if (isProduction && error) {
  Sentry.captureException(error, {
    level: 'error',
    extra: { message, ...data }
  });
}
```

---

## 📊 Migración desde console.log

### Patrón de Migración

```typescript
// Antes
console.log('Loading products...');
console.error('Error:', error);

// Después
logger.debug('[ProductGrid] Loading products');
logger.error('[ProductGrid] Error loading products', error);
```

### Script de Búsqueda

Para encontrar console.log en tu proyecto:

```bash
# Ver todos los console.log
npm run grep "console\.(log|error|warn|info)"

# O manualmente
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
```

---

## ✅ Checklist de Migración

Para migrar un archivo al nuevo sistema:

- [ ] Importar `logger` de `@/lib/logger`
- [ ] Reemplazar `console.log` → `logger.debug` o `logger.info`
- [ ] Reemplazar `console.error` → `logger.error`
- [ ] Reemplazar `console.warn` → `logger.warn`
- [ ] Agregar contexto `[ComponentName]` a mensajes
- [ ] Agregar objetos de datos donde sea útil
- [ ] Probar en desarrollo que los logs funcionan
- [ ] Verificar que no se ven logs en producción (build)

---

## 🎓 Tips y Best Practices

1. **Usar niveles apropiados**:
   - `debug`: Información de debugging detallada
   - `info`: Flujo normal de la aplicación
   - `warn`: Situaciones inesperadas pero manejables
   - `error`: Errores que necesitan atención

2. **Agregar contexto útil**:
   ```typescript
   // ❌ Poco útil
   logger.info('Order created');

   // ✅ Muy útil
   logger.info('[Checkout] Order created', {
     orderId,
     total,
     itemCount,
     userId
   });
   ```

3. **Usar timers para operaciones costosas**:
   ```typescript
   logger.time('[Heavy] Operation');
   await heavyOperation();
   logger.timeEnd('[Heavy] Operation');
   ```

4. **Agrupar logs relacionados**:
   ```typescript
   logger.groupCollapsed('[Init] Application startup', () => {
     logger.info('Loading config');
     logger.info('Connecting to Firebase');
     logger.info('Initializing state');
   });
   ```

---

## 📚 Referencias

- **Archivo**: `src/lib/logger.ts`
- **Ejemplos**: `src/store/cartStore.ts`
- **Fase**: Fase 2 - Estabilidad y UX

---

**Próximos Pasos**: Continuar migrando archivos críticos al nuevo sistema de logging.
