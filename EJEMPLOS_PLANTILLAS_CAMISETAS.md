# 🎨 Guía de Plantillas para Camisetas - EJEMPLOS REALES

## 📋 Campos que tienen tus camisetas

Tus camisetas tienen estos campos (los puedes ver en el personalizador):

1. **Color de la camiseta** (`tshirt_color`)
   - Colores disponibles: Blanco, Negro, Rojo, Azul, Verde, Amarillo, Rosa, Gris

2. **Talla** (`tshirt_size`)
   - Tallas disponibles: XS, S, M, L, XL, XXL

3. **Diseño personalizado** (`custom_design`)
   - Subir una imagen (opcional)

---

## 💡 ¿Qué es el JSON de Campos?

El JSON es simplemente **una lista de los valores que quieres que la plantilla pre-llene**.

**Piensa en ello como una receta:**
- Si creas una plantilla "Camiseta Cumpleaños Roja", el JSON dirá: "pre-llena el color con Rojo y la talla con M"
- Cuando alguien seleccione esa plantilla, esos valores se llenarán automáticamente

---

## ✅ Ejemplo 1: Plantilla Simple de Cumpleaños

### 📝 Datos del Formulario:
- **Nombre:** Cumpleaños Elegante Rojo
- **Descripción:** Camiseta roja talla M perfecta para cumpleaños
- **Categoría:** camisetas
- **Subcategoría:** Cumpleaños
- **Tags:** cumpleaños, rojo, elegante, fiesta
- **URL Thumbnail:** (deja vacío o pon una imagen de ejemplo)
- **Premium:** ❌ NO (para que sea gratis)

### 🔧 JSON de Campos:
```json
[
  {
    "fieldId": "tshirt_color",
    "value": "red",
    "displayValue": "Rojo"
  },
  {
    "fieldId": "tshirt_size",
    "value": "M",
    "displayValue": "M"
  }
]
```

### 💬 Explicación:
- `fieldId`: El ID del campo (debe coincidir exactamente con el campo de tu camiseta)
- `value`: El valor técnico (el ID del color o la talla)
- `displayValue`: Lo que se mostrará al usuario

**Resultado:** Cuando alguien seleccione esta plantilla, automáticamente se llenará:
- Color: Rojo
- Talla: M

---

## ✅ Ejemplo 2: Plantilla de Deportes

### 📝 Datos del Formulario:
- **Nombre:** Team Sports Azul
- **Descripción:** Camiseta deportiva azul para equipos
- **Categoría:** camisetas
- **Subcategoría:** Deportes
- **Tags:** deportes, equipo, azul, atlético
- **Premium:** ❌ NO

### 🔧 JSON de Campos:
```json
[
  {
    "fieldId": "tshirt_color",
    "value": "blue",
    "displayValue": "Azul"
  },
  {
    "fieldId": "tshirt_size",
    "value": "L",
    "displayValue": "L"
  }
]
```

---

## ✅ Ejemplo 3: Plantilla Minimalista

### 📝 Datos del Formulario:
- **Nombre:** Minimalista Blanca
- **Descripción:** Camiseta blanca básica para cualquier ocasión
- **Categoría:** camisetas
- **Subcategoría:** Empresarial
- **Tags:** minimalista, blanco, básico, trabajo

### 🔧 JSON de Campos:
```json
[
  {
    "fieldId": "tshirt_color",
    "value": "white",
    "displayValue": "Blanco"
  },
  {
    "fieldId": "tshirt_size",
    "value": "M",
    "displayValue": "M"
  }
]
```

---

## ✅ Ejemplo 4: Plantilla con Imagen Pre-cargada

### 📝 Datos del Formulario:
- **Nombre:** Love Pink con Corazón
- **Descripción:** Camiseta rosa con diseño de corazón pre-cargado
- **Categoría:** camisetas
- **Subcategoría:** Romántico
- **Tags:** amor, romántico, rosa, corazón

### 🔧 JSON de Campos:
```json
[
  {
    "fieldId": "tshirt_color",
    "value": "pink",
    "displayValue": "Rosa"
  },
  {
    "fieldId": "tshirt_size",
    "value": "S",
    "displayValue": "S"
  },
  {
    "fieldId": "custom_design",
    "value": "https://tu-url-de-imagen.com/corazon.png",
    "displayValue": "Diseño de Corazón",
    "imageUrl": "https://tu-url-de-imagen.com/corazon.png"
  }
]
```

**Nota:** Para pre-cargar una imagen, necesitas tener la URL de la imagen. Puedes subirla primero a Firebase Storage usando el uploader de cliparts.

---

## ✅ Ejemplo 5: Plantilla Solo con Talla (para que elijan color)

### 🔧 JSON de Campos:
```json
[
  {
    "fieldId": "tshirt_size",
    "value": "M",
    "displayValue": "M"
  }
]
```

**Explicación:** No incluimos el color, así el usuario puede elegir el color que quiera, pero la talla M ya viene seleccionada.

---

## 📊 Referencia Rápida de Valores

### Colores disponibles:
| value    | displayValue | Color      |
|----------|--------------|------------|
| `white`  | Blanco       | Blanco     |
| `black`  | Negro        | Negro      |
| `red`    | Rojo         | Rojo       |
| `blue`   | Azul         | Azul       |
| `green`  | Verde        | Verde      |
| `yellow` | Amarillo     | Amarillo   |
| `pink`   | Rosa         | Rosa       |
| `gray`   | Gris         | Gris       |

### Tallas disponibles:
| value | displayValue |
|-------|--------------|
| `XS`  | XS           |
| `S`   | S            |
| `M`   | M            |
| `L`   | L            |
| `XL`  | XL           |
| `XXL` | XXL          |

---

## 💰 ¿Qué significa "Premium"?

### ❌ Premium = NO (desmarcado)
**Plantilla GRATIS:**
- Todos los usuarios pueden usarla sin pagar
- Aparece en el catálogo normal
- Ideal para plantillas básicas que quieres que todos usen

### ✅ Premium = SÍ (marcado)
**Plantilla de PAGO:**
- Solo usuarios con suscripción premium pueden usarla
- Aparece con una insignia de "Premium" ⭐
- Ideal para plantillas exclusivas o diseños especiales

**IMPORTANTE:** El sistema Premium **NO COBRA AUTOMÁTICAMENTE**. Solo sirve para:
1. **Filtrar** qué usuarios pueden ver/usar la plantilla
2. **Marcar visualmente** las plantillas como premium
3. **Tú decides** si quieres implementar un sistema de pago más adelante

**Recomendación inicial:** Deja todas en **NO premium** al principio para que todos puedan probar las funcionalidades.

---

## 🎯 Plantillas Recomendadas para Empezar

Te recomiendo crear al menos estas 5 plantillas:

### 1. Cumpleaños Clásico (Rojo, M)
```json
[
  {"fieldId": "tshirt_color", "value": "red", "displayValue": "Rojo"},
  {"fieldId": "tshirt_size", "value": "M", "displayValue": "M"}
]
```

### 2. Deportes Azul (Azul, L)
```json
[
  {"fieldId": "tshirt_color", "value": "blue", "displayValue": "Azul"},
  {"fieldId": "tshirt_size", "value": "L", "displayValue": "L"}
]
```

### 3. Empresarial Blanca (Blanco, M)
```json
[
  {"fieldId": "tshirt_color", "value": "white", "displayValue": "Blanco"},
  {"fieldId": "tshirt_size", "value": "M", "displayValue": "M"}
]
```

### 4. Romántico Rosa (Rosa, S)
```json
[
  {"fieldId": "tshirt_color", "value": "pink", "displayValue": "Rosa"},
  {"fieldId": "tshirt_size", "value": "S", "displayValue": "S"}
]
```

### 5. Casual Negro (Negro, L)
```json
[
  {"fieldId": "tshirt_color", "value": "black", "displayValue": "Negro"},
  {"fieldId": "tshirt_size", "value": "L", "displayValue": "L"}
]
```

---

## ❓ Preguntas Frecuentes

### ¿Puedo dejar algunos campos vacíos?
**Sí!** No tienes que llenar todos los campos. Por ejemplo:
```json
[
  {"fieldId": "tshirt_color", "value": "red", "displayValue": "Rojo"}
]
```
Solo llena el color, y el usuario elegirá la talla.

### ¿Qué pasa si me equivoco en un fieldId?
El sistema simplemente ignorará ese campo. Asegúrate de usar los IDs exactos:
- `tshirt_color`
- `tshirt_size`
- `custom_design`

### ¿Puedo cambiar una plantilla después de crearla?
Por ahora no hay interfaz de edición. Tendrías que:
1. Crear una nueva plantilla con los datos correctos
2. Eliminar la antigua desde Firebase Console

### ¿Dónde consigo URLs de imágenes para thumbnails?
- Puedes usar el uploader de cliparts para subir imágenes
- Usar servicios como Imgur, ImgBB
- Firebase Storage (ya lo tienes configurado)
- Placeholder: `https://via.placeholder.com/400/FF0000/FFFFFF?text=Cumpleaños`

---

## 🚀 Siguiente Paso

1. Ve a: `http://localhost:4321/admin/content-manager`
2. Crea tu primera plantilla usando uno de estos ejemplos
3. Ve al personalizador de camisetas
4. Click en "Plantillas" → Deberías ver tu plantilla
5. Selecciónala → Los campos se llenan automáticamente ✨

---

¡Eso es todo! Con estos ejemplos ya puedes crear todas las plantillas que quieras. 🎉
