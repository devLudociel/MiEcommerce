# 🔥 Guía de Deploy de Firestore Indexes

## 📋 ¿Por qué son necesarios los índices?

Firestore requiere índices para consultas que:
- Filtran por múltiples campos (`where` + `where`)
- Ordenan por un campo diferente al filtrado (`where` + `orderBy`)
- Usan operadores de rango en múltiples campos

Sin estos índices, las consultas fallarán en producción con error:
```
The query requires an index
```

---

## 🚀 Deploy de Índices - Paso a Paso

### **Opción 1: Usando Firebase CLI (RECOMENDADO)**

#### **1. Instalar Firebase CLI**

```bash
# Si no lo tienes instalado
npm install -g firebase-tools

# Verificar instalación
firebase --version
```

#### **2. Login en Firebase**

```bash
firebase login
```

Se abrirá tu navegador para autenticar con tu cuenta de Google.

#### **3. Inicializar proyecto (si es primera vez)**

```bash
# En la raíz del proyecto
firebase init

# Selecciona:
# - Firestore: Configure security rules and indexes files
# - Usa el proyecto existente
# - Acepta los archivos por defecto (firestore.rules, firestore.indexes.json)
```

#### **4. Deploy de Índices**

```bash
# Deploy SOLO los índices (sin reglas)
firebase deploy --only firestore:indexes

# O deploy todo (reglas + índices)
firebase deploy --only firestore
```

**Salida esperada:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/tu-proyecto/overview
```

#### **5. Verificar en Firebase Console**

Ve a: https://console.firebase.google.com/project/[tu-proyecto]/firestore/indexes

Deberías ver **12 índices** creados o en proceso de creación:
- wallet_transactions (userId + createdAt)
- orders (idempotencyKey)
- orders (userId + createdAt)
- orders (status + createdAt)
- rateLimits (identifier + scope)
- reviews (productId + userId)
- coupon_usages (couponId + userId)
- coupons (code + active)
- products (active + onSale)
- products (categoryId + active)
- products (categoryId + subcategoryId + active)
- products (active + name)

⚠️ **Nota:** Los índices pueden tardar varios minutos en crearse, especialmente si ya tienes datos.

---

### **Opción 2: Crear manualmente desde Firebase Console**

Si no quieres usar Firebase CLI:

#### **1. Ve a Firestore Console**
https://console.firebase.google.com/project/[tu-proyecto]/firestore/indexes

#### **2. Click "Crear índice"**

Para cada índice en `firestore.indexes.json`, crea uno manualmente:

**Ejemplo: orders (userId + createdAt)**
- Collection ID: `orders`
- Fields:
  - userId (Ascending)
  - createdAt (Descending)
- Query scope: Collection
- Click "Crear"

Repite para los 12 índices.

---

## 📊 Índices Configurados

### **Índice 1: wallet_transactions (userId + createdAt)**
**Uso:** Listar transacciones de billetera por usuario
```javascript
query(
  collection(db, 'wallet_transactions'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
)
```

### **Índice 2: orders (idempotencyKey)**
**Uso:** Prevenir pedidos duplicados
```javascript
query(
  collection(db, 'orders'),
  where('idempotencyKey', '==', key)
)
```

### **Índice 3: orders (userId + createdAt)**
**Uso:** Listar pedidos de un usuario
```javascript
query(
  collection(db, 'orders'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
)
```

### **Índice 4: orders (status + createdAt)**
**Uso:** Filtrar pedidos por estado en panel admin
```javascript
query(
  collection(db, 'orders'),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
)
```

### **Índice 5: rateLimits (identifier + scope)**
**Uso:** Rate limiting persistente
```javascript
query(
  collection(db, 'rateLimits'),
  where('identifier', '==', ip),
  where('scope', '==', 'login')
)
```

### **Índice 6: reviews (productId + userId)**
**Uso:** Validar que usuario no haga reviews duplicadas
```javascript
query(
  collection(db, 'reviews'),
  where('productId', '==', productId),
  where('userId', '==', userId)
)
```

### **Índice 7: coupon_usages (couponId + userId)**
**Uso:** Verificar si usuario ya usó un cupón
```javascript
query(
  collection(db, 'coupon_usages'),
  where('couponId', '==', couponId),
  where('userId', '==', userId)
)
```

### **Índice 8: coupons (code + active)**
**Uso:** Validar cupones activos
```javascript
query(
  collection(db, 'coupons'),
  where('code', '==', 'DESCUENTO10'),
  where('active', '==', true)
)
```

### **Índice 9: products (active + onSale)**
**Uso:** Listar productos en oferta
```javascript
query(
  collection(db, 'products'),
  where('active', '==', true),
  where('onSale', '==', true)
)
```

### **Índice 10: products (categoryId + active)**
**Uso:** Filtrar productos por categoría
```javascript
query(
  collection(db, 'products'),
  where('categoryId', '==', 'textil'),
  where('active', '==', true)
)
```

### **Índice 11: products (categoryId + subcategoryId + active)**
**Uso:** Filtrar por categoría y subcategoría
```javascript
query(
  collection(db, 'products'),
  where('categoryId', '==', 'textil'),
  where('subcategoryId', '==', 'camisetas'),
  where('active', '==', true)
)
```

### **Índice 12: products (active + name)**
**Uso:** Búsqueda de productos activos ordenados por nombre
```javascript
query(
  collection(db, 'products'),
  where('active', '==', true),
  orderBy('name')
)
```

---

## 🧪 Testing de Índices

### **Script de verificación:**

```bash
# Crear script de test
cat > scripts/test-indexes.js << 'EOF'
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Config de Firebase (usar tus credenciales)
const app = initializeApp({
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function testIndexes() {
  console.log('🧪 Testing Firestore indexes...\n');

  try {
    // Test 1: orders (status + createdAt)
    console.log('Test 1: orders (status + createdAt)');
    const q1 = query(
      collection(db, 'orders'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    await getDocs(q1);
    console.log('✅ PASSED\n');

    // Test 2: products (active + onSale)
    console.log('Test 2: products (active + onSale)');
    const q2 = query(
      collection(db, 'products'),
      where('active', '==', true),
      where('onSale', '==', true)
    );
    await getDocs(q2);
    console.log('✅ PASSED\n');

    console.log('🎉 All indexes working correctly!');
  } catch (error) {
    console.error('❌ Index test failed:', error.message);
    if (error.message.includes('index')) {
      console.log('\n💡 Run: firebase deploy --only firestore:indexes');
    }
  }
}

testIndexes();
EOF

# Ejecutar test
node scripts/test-indexes.js
```

---

## ⚠️ Troubleshooting

### **Error: "The query requires an index"**

**Solución:**
```bash
# 1. Copia el link del error (si aparece)
# 2. O deploy manual:
firebase deploy --only firestore:indexes
```

### **Error: "PERMISSION_DENIED: Missing or insufficient permissions"**

**Causa:** Firestore Rules muy restrictivas

**Solución temporal para testing:**
```javascript
// firestore.rules (SOLO PARA DESARROLLO)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ INSEGURO
    }
  }
}
```

⚠️ **NO uses esto en producción!**

### **Índices en estado "Creando..."**

**Causa:** Firestore está construyendo el índice

**Solución:** Espera 5-15 minutos. Si ya tienes muchos documentos, puede tardar horas.

Verifica el progreso en:
https://console.firebase.google.com/project/[tu-proyecto]/firestore/indexes

---

## 📝 Mantenimiento

### **Agregar nuevo índice:**

1. Edita `firestore.indexes.json`
2. Agrega el nuevo índice:
```json
{
  "collectionGroup": "nueva_coleccion",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "campo1", "order": "ASCENDING" },
    { "fieldPath": "campo2", "order": "DESCENDING" }
  ]
}
```
3. Deploy:
```bash
firebase deploy --only firestore:indexes
```

### **Eliminar índice obsoleto:**

1. Elimina del archivo `firestore.indexes.json`
2. Deploy:
```bash
firebase deploy --only firestore:indexes
```
3. Elimina manualmente desde Firebase Console (opcional)

---

## ✅ Checklist Final

Antes de hacer deploy a producción:

- [ ] Firebase CLI instalado y autenticado
- [ ] Archivo `firestore.indexes.json` actualizado
- [ ] Deploy ejecutado: `firebase deploy --only firestore:indexes`
- [ ] Todos los índices en estado "Enabled" en Firebase Console
- [ ] Testing manual de consultas críticas
- [ ] No hay errores "requires an index" en logs

---

## 📚 Referencias

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)

---

🎉 **¡Listo!** Tus índices están configurados y listos para producción.
