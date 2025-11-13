# 📚 Guía: Cómo Poblar la Base de Datos

Esta guía explica cómo añadir **plantillas predefinidas** y **cliparts** para que las funcionalidades de la Fase 3 - Growth funcionen completamente.

---

## 🎯 Opciones Disponibles

Tienes **2 opciones** para poblar la base de datos:

### ✅ Opción 1: Panel de Administración (Recomendado)
**Más fácil y visual** - Usa la interfaz web

### ⚙️ Opción 2: Script de Seed
**Más rápido** - Carga datos en lote

---

## 📋 Opción 1: Panel de Administración

### 1. Acceder al Panel

```
http://localhost:4321/admin/content-manager
```

O en producción:
```
https://tudominio.com/admin/content-manager
```

### 2. Crear Plantillas

**Lado izquierdo del panel:**

1. **Nombre:** Ej: "Cumpleaños Elegante"
2. **Descripción:** Ej: "Diseño elegante para celebraciones de cumpleaños"
3. **Categoría:** Selecciona el tipo de producto (camisetas, tazas, etc.)
4. **Subcategoría:** Ej: "Cumpleaños", "Deportes", etc.
5. **Tags:** Ej: "cumpleaños, elegante, dorado, fiesta"
6. **URL Thumbnail:** Link a imagen de preview
7. **Campos JSON:** Define los valores pre-llenados

**Ejemplo de JSON para campos:**
```json
[
  {
    "fieldId": "field_1763027925175",
    "value": "¡Feliz Cumpleaños!",
    "displayValue": "¡Feliz Cumpleaños!"
  },
  {
    "fieldId": "field_1763027966831",
    "value": "gold",
    "displayValue": "Dorado"
  }
]
```

8. **Premium (opcional):** Marca si es plantilla de pago
9. Click en **"Crear Plantilla"**

### 3. Subir Cliparts

**Lado derecho del panel:**

1. **Imagen:** Click en "Seleccionar archivo"
   - Formatos: PNG, SVG, JPG
   - Recomendado: 512x512px con fondo transparente
   - SVG es mejor (escalable)

2. **Nombre:** Ej: "Corazón Rojo"

3. **Categoría:** Ej: "Celebraciones"

4. **Subcategoría:** Ej: "Amor"

5. **Tags:** Ej: "corazón, amor, rojo, romántico"

6. **Formato:** Detecta automáticamente (PNG/SVG)

7. **Opciones:**
   - ✅ **Tiene transparencia:** Si el fondo es transparente
   - ✅ **Premium:** Si requiere pago

8. Click en **"Crear Clipart"**

---

## ⚙️ Opción 2: Script de Seed (Rápido)

### 1. Crear el Script

Crea: `/scripts/seed-content.js`

```javascript
// scripts/seed-content.js
import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================================================
// PLANTILLAS DE EJEMPLO
// ============================================================================

const templates = [
  {
    name: 'Cumpleaños Elegante',
    description: 'Diseño elegante para celebraciones de cumpleaños',
    category: 'camisetas',
    subcategory: 'Cumpleaños',
    tags: ['cumpleaños', 'elegante', 'dorado', 'fiesta'],
    thumbnail: 'https://via.placeholder.com/400/FFD700/000000?text=Cumpleaños+Elegante',
    isPremium: false,
    popularity: 0,
    template: {
      fields: [
        {
          fieldId: 'field_text',
          value: '¡Feliz Cumpleaños!',
          displayValue: '¡Feliz Cumpleaños!',
        },
      ],
    },
  },
  {
    name: 'Team Sports',
    description: 'Diseño deportivo con número de jugador',
    category: 'camisetas',
    subcategory: 'Deportes',
    tags: ['deportes', 'equipo', 'número', 'atlético'],
    thumbnail: 'https://via.placeholder.com/400/0000FF/FFFFFF?text=Team+Sports',
    isPremium: false,
    popularity: 0,
    template: {
      fields: [
        {
          fieldId: 'field_number',
          value: '10',
          displayValue: '10',
        },
      ],
    },
  },
  // Añade más plantillas aquí...
];

// ============================================================================
// CLIPARTS DE EJEMPLO
// ============================================================================

const cliparts = [
  {
    name: 'Corazón Rojo',
    category: 'Celebraciones',
    subcategory: 'Amor',
    tags: ['corazón', 'amor', 'rojo', 'romántico'],
    imageUrl: 'https://via.placeholder.com/512/FF0000/FFFFFF?text=❤️',
    thumbnailUrl: 'https://via.placeholder.com/128/FF0000/FFFFFF?text=❤️',
    isPremium: false,
    usageCount: 0,
    format: 'png',
    hasTransparency: true,
    dimensions: { width: 512, height: 512 },
    colors: ['#FF0000'],
    createdBy: 'system',
  },
  {
    name: 'Estrella Dorada',
    category: 'Iconos',
    subcategory: 'Celebración',
    tags: ['estrella', 'dorado', 'premio', 'éxito'],
    imageUrl: 'https://via.placeholder.com/512/FFD700/000000?text=⭐',
    thumbnailUrl: 'https://via.placeholder.com/128/FFD700/000000?text=⭐',
    isPremium: false,
    usageCount: 0,
    format: 'png',
    hasTransparency: true,
    dimensions: { width: 512, height: 512 },
    colors: ['#FFD700'],
    createdBy: 'system',
  },
  // Añade más cliparts aquí...
];

// ============================================================================
// FUNCIONES DE SEED
// ============================================================================

async function seedTemplates() {
  console.log('📝 Creando plantillas...');
  const batch = db.batch();

  for (const template of templates) {
    const docRef = db.collection('design_templates').doc();
    batch.set(docRef, {
      ...template,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`✅ ${templates.length} plantillas creadas`);
}

async function seedCliparts() {
  console.log('🖼️  Creando cliparts...');
  const batch = db.batch();

  for (const clipart of cliparts) {
    const docRef = db.collection('cliparts').doc();
    batch.set(docRef, {
      ...clipart,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`✅ ${cliparts.length} cliparts creados`);
}

// ============================================================================
// EJECUTAR
// ============================================================================

async function main() {
  try {
    await seedTemplates();
    await seedCliparts();
    console.log('\n🎉 ¡Base de datos poblada correctamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

### 2. Ejecutar el Script

```bash
# Instalar dependencias si no las tienes
npm install firebase-admin

# Ejecutar el script
node scripts/seed-content.js
```

---

## 🎨 Recursos para Obtener Cliparts

### Gratuitos (Open Source)
- **Openmoji** (https://openmoji.org/) - Emojis open source
- **Heroicons** (https://heroicons.com/) - Iconos minimalistas
- **Bootstrap Icons** (https://icons.getbootstrap.com/) - 1800+ íconos
- **Font Awesome Free** (https://fontawesome.com/) - Iconos populares

### Premium (Requieren Licencia)
- **Flaticon** (https://www.flaticon.com/) - 10M+ iconos
- **Freepik** (https://www.freepik.com/) - Ilustraciones y vectores
- **Iconfinder** (https://www.iconfinder.com/) - Iconos premium
- **Noun Project** (https://thenounproject.com/) - Iconos simples

### Recomendaciones
- **Formato:** Preferir SVG (escalable sin pérdida)
- **Tamaño:** 512x512px mínimo
- **Fondo:** Transparente (PNG con alpha channel o SVG)
- **Calidad:** Alta resolución
- **Licencia:** Verificar que puedes usar comercialmente

---

## 📊 Cantidad Recomendada

Para un lanzamiento inicial:

- **Plantillas:** 20-30 por categoría principal
  - 10 Cumpleaños
  - 10 Deportes
  - 5 Empresarial
  - 5 Romántico

- **Cliparts:** 100-200 elementos
  - 30 Iconos básicos
  - 20 Animales
  - 20 Deportes
  - 15 Naturaleza
  - 15 Celebraciones

Puedes empezar con menos e ir añadiendo gradualmente.

---

## 🔍 Verificar que Funciona

### 1. Plantillas
```
1. Ir a un producto personalizable
2. Click en botón "Plantillas"
3. Deberías ver las plantillas creadas
4. Click en una → se pre-llena automáticamente
```

### 2. Cliparts
```
1. Ir a un producto personalizable
2. Click en botón "Cliparts"
3. Deberías ver los cliparts por categoría
4. Buscar por nombre o tags
5. Click en uno → se añade al diseño
```

---

## 🐛 Solución de Problemas

### "No se muestran las plantillas"
- Verifica que la colección se llama `design_templates`
- Verifica que el campo `category` coincide con tu producto
- Revisa la consola del navegador para errores

### "No se muestran los cliparts"
- Verifica que la colección se llama `cliparts`
- Verifica que las URLs de imágenes son accesibles
- Revisa permisos de Firebase Storage

### "Error al subir imagen de clipart"
- Verifica Firebase Storage Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cliparts/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### "No tengo acceso al panel de admin"
- Verifica que tu email está en `PUBLIC_ADMIN_EMAILS` en `.env`
- O configura custom claims de admin en Firebase Auth

---

## 🎯 Siguiente Paso

Una vez poblada la base de datos:

1. ✅ Probar todas las funcionalidades
2. ✅ Crear más contenido basado en feedback
3. ✅ Monitorear qué plantillas/cliparts son más usados
4. ✅ Ir añadiendo más contenido gradualmente

---

## 💡 Tips Adicionales

- **Nombres descriptivos:** Facilitan la búsqueda
- **Tags relevantes:** Mejoran la búsqueda
- **Categorización correcta:** Ayuda a encontrar rápido
- **Thumbnails atractivos:** Aumentan el uso
- **Variedad:** Ofrece opciones para diferentes gustos
- **Calidad:** Mejor pocas plantillas buenas que muchas malas

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs del navegador (F12 → Console)
2. Verifica Firestore en Firebase Console
3. Revisa que las colecciones tienen el nombre correcto
4. Verifica que los datos tienen todos los campos requeridos

---

¡Listo! Con esto ya puedes poblar tu base de datos y tener todas las funcionalidades funcionando. 🚀
