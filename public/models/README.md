# 📦 Modelos 3D para Preview

Esta carpeta contiene los modelos 3D profesionales (.glb) que se usan en la vista previa de productos personalizables.

## 🎨 Modelos Recomendados de Sketchfab (GRATUITOS)

### 1️⃣ TAZA (Mug)
**Nombre del archivo:** `mug.glb`

**Opción A - Coffee Mug by Kero.Los (RECOMENDADO)**
- URL: https://sketchfab.com/3d-models/coffee-mug-8ef6106a071845368d94bb7bd827bfdb
- Calidad: Alta (4K textures, Blender)
- Licencia: CC Attribution

**Opción B - Low-poly Coffee Mug**
- URL: https://sketchfab.com/3d-models/low-poly-coffee-mug-e1570f03bbf64eb6b76fded89e7f1686
- Calidad: Buena (optimizado para web)
- Licencia: CC Attribution

### 2️⃣ TERMO (Thermos)
**Nombre del archivo:** `thermos.glb`

**Opción A - Thermos by nurhadimli (RECOMENDADO)**
- URL: https://sketchfab.com/3d-models/thermos-21983c1d607d4625a960d3d8fc4c5b6a
- Calidad: Alta
- Licencia: CC Attribution

**Opción B - Thermos Hydration Bottle 24OZ**
- URL: https://sketchfab.com/3d-models/thermos-hydration-bottle-24oz-794b730ae452424bb3a9ce3c6caaff7a
- Calidad: Alta (Blender 2.83, Substance Painter)
- Licencia: CC Attribution

### 3️⃣ BOTELLA (Bottle)
**Nombre del archivo:** `bottle.glb`

**Opción A - Thermos Bottle by Loopenkoopen (RECOMENDADO)**
- URL: https://sketchfab.com/3d-models/thermos-bottle-f3f4dc4232164bef83a39353d9ac60cd
- Calidad: Alta
- Licencia: CC Attribution

---

## 📥 Cómo Descargar e Instalar

### Paso 1: Ir a Sketchfab
1. Abre los enlaces de arriba en tu navegador
2. Haz clic en el botón **"Download 3D Model"** (esquina inferior derecha del visor 3D)

### Paso 2: Seleccionar Formato
1. En el popup de descarga, selecciona **"glTF (.gltf/.glb)"** como formato
2. **IMPORTANTE:** Activa la opción **"Binary glTF (.glb)"**
3. Haz clic en **"Download"**

### Paso 3: Renombrar Archivos
Después de descargar, descomprime el ZIP y renombra los archivos:

```bash
# Taza
source.glb → mug.glb

# Termo
source.glb → thermos.glb

# Botella
source.glb → bottle.glb
```

### Paso 4: Copiar a Esta Carpeta
Coloca los 3 archivos `.glb` en esta carpeta:
```
/home/user/MiEcommerce/public/models/
├── mug.glb
├── thermos.glb
└── bottle.glb
```

### Paso 5: Verificar
Recarga la página `/test-3d-mug` y deberías ver los modelos profesionales cargados.

---

## 🔧 Alternativas Si No Quieres Descargar Manualmente

### Opción 1: Buscar otros modelos
Explora en Sketchfab:
- https://sketchfab.com/tags/mug
- https://sketchfab.com/tags/thermos
- https://sketchfab.com/tags/coffee-cup

Filtra por:
- ✅ Downloadable
- ✅ CC License (gratuitos)

### Opción 2: Generar con IA (Meshy.ai)
1. Ve a https://www.meshy.ai
2. Crea cuenta gratuita
3. Sube una imagen de taza/termo
4. La IA genera modelo 3D en ~2 minutos
5. Descarga como .glb

### Opción 3: Crear en Blender
Si sabes usar Blender, puedes modelar tu propio diseño y exportar como .glb

---

## ⚠️ Licencias y Atribución

Los modelos de Sketchfab tienen licencia **CC Attribution**, lo que significa:

✅ **PERMITIDO:**
- Usar comercialmente
- Modificar
- Distribuir

❌ **REQUERIDO:**
- Dar crédito al autor original
- Enlazar a la licencia CC BY

**Ejemplo de atribución:**
```
"Coffee Mug" (https://skfb.ly/xxx) by Kero.Los is licensed under
Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
```

---

## 🎯 Configuración Avanzada

Si quieres ajustar cómo se aplica la textura del usuario, edita:
```typescript
/src/components/3d/ThreeDMugPreview.tsx
```

En la función `GLBModel`, ajusta:
- `scale` - Tamaño del modelo
- `wrapS` / `wrapT` - Modo de repetición de textura
- Materiales específicos por nombre de mesh

---

## 📊 Estado Actual

- [ ] `mug.glb` - Modelo de taza
- [ ] `thermos.glb` - Modelo de termo
- [ ] `bottle.glb` - Modelo de botella

**Marca con [x] cuando completes cada descarga**

---

## 💡 Tips

1. **Tamaño de archivos**: Prefiere modelos < 5MB para carga rápida
2. **Calidad vs Rendimiento**: Low-poly se carga más rápido pero se ve más simple
3. **Prueba varios**: Descarga varios modelos y elige el que mejor se vea con tus diseños
4. **Optimización**: Si un modelo es muy pesado, usa https://gltf.report/ para optimizarlo

---

¿Necesitas ayuda? Consulta la documentación de Three.js sobre GLB:
https://threejs.org/docs/#examples/en/loaders/GLTFLoader
