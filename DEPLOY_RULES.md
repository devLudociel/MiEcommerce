# 🚀 Desplegar Reglas de Firestore

## ⚠️ Acción Requerida

Se han actualizado las reglas de Firestore para soportar la colección `customization_schemas`.
**Debes desplegar estas reglas manualmente** para que el sistema funcione correctamente.

## 📋 Opción 1: Firebase CLI (Recomendado)

```bash
# 1. Asegúrate de estar autenticado en Firebase
firebase login

# 2. Despliega las reglas
firebase deploy --only firestore:rules
```

## 🌐 Opción 2: Consola de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Reglas**
4. Copia el contenido del archivo `firestore.rules` del proyecto
5. Pégalo en el editor de la consola
6. Click en **Publicar**

## 🔍 Verificar el Despliegue

Después de desplegar, verifica que las reglas se aplicaron correctamente:

```bash
# Ver las reglas actuales
firebase firestore:rules get
```

## ✅ Reglas Agregadas

```javascript
// Customization schemas (esquemas de personalización dinámica)
match /customization_schemas/{schemaId} {
  allow read: if true; // Cualquiera puede leer para ver los customizers
  allow write: if isAdmin(); // Solo admins pueden crear/editar/eliminar
}
```

### Permisos Configurados:
- **Lectura (`read`)**: Público - Permite que cualquier usuario cargue los schemas para ver los customizers
- **Escritura (`write`)**: Solo administradores - Protege los schemas de modificaciones no autorizadas

## 🧪 Probar que Funciona

Después de desplegar las reglas:

1. Ve a `/admin/customization`
2. Debería cargar sin errores de permisos
3. Intenta aplicar un template o crear un schema
4. Ve a `/personalizar/Figura-personalizada-resina`
5. Debería cargar el customizer dinámico con el schema guardado

## ❗ Error Sin Despliegue

Si intentas usar el sistema sin desplegar las reglas, verás este error:

```
FirebaseError: Missing or insufficient permissions.
```

---

**Nota**: Este archivo se puede eliminar después de desplegar las reglas exitosamente.
