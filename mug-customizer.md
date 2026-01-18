📘 Mug Customizer – Technical Specification (Astro + React)

File: mug-customizer.md
Purpose: Defines the full behaviour, UI rules, component architecture and technical requirements for a customizable 3D mug designer similar to mug3d.com or pacdora.

🎯 Goal

Create an interactive Mug Customizer for the website.
Users must be able to personalize a mug by adding images or text, visualize the result in 3D, and export a final print-ready design.

The customizer must work inside an Astro website using React components.

🔧 Technology Stack
Frontend

Astro (main framework)

React (UI components)

react-konva → 2D editor for artwork (canvas)

@react-three/fiber → 3D viewer

@react-three/drei → helpers (OrbitControls, useTexture)

TypeScript (recommended)

TailwindCSS (optional UI styling)

Assets

1–3 GLB/GLTF models of mugs (11oz, 15oz, interior-color mug)

PNG templates defining print area

🧩 Overall Architecture

The customizer has two main modules:

1. 2D Artwork Editor (react-konva)

Canvas size:

2000 × 900 px (represents ~20 × 9 cm print area)

User actions:

Upload image(s)

Resize / rotate / move images

Add text (fonts, color, size, alignment)

Delete elements

Zoom canvas (optional)

Export:

Generates a PNG (transparent or white)

Used both for printing AND as texture for the 3D mug

2. 3D Mug Viewer (Three.js + R3F)

Loads a .glb/.gltf mug model

Applies exported 2D PNG as wrapping texture

Camera rotation enabled (OrbitControls)

Realistic lighting

Options:

Change mug color (white, black, pastel...)

Change interior color

Change handle color

Output:

The user sees a live rotating/interactive 3D preview

🖼 UI Layout
-----------------------------------------
|         Mug Customizer Layout         |
-----------------------------------------
|  Left side: 2D Editor (react-konva)   |
|  - Upload image                       |
|  - Add text                           |
|  - Move/scale layers                  |
|  - Export button                      |
-----------------------------------------
|  Right side: 3D Preview (R3F)         |
|  - Rotatable mug                      |
|  - Texture = exported canvas          |
-----------------------------------------
|  Bottom:                              |
|  - Add to cart / Confirm design       |
-----------------------------------------

📤 Export Requirements

When user clicks “Confirm Design”:

Save:

printDesign.png

2000×900 px

high-res, print-ready

RGB or CMYK optional

preview.png (optional)

snapshot of the 3D mug

Metadata JSON:

{
  "designWidth": 2000,
  "designHeight": 900,
  "mugType": "11oz",
  "colors": {
    "body": "#ffffff",
    "interior": "#ff0000",
    "handle": "#ff0000"
  }
}

The exported file is then:

Uploaded to backend / database

Attached to the final order

🧠 Functional Requirements
📌 Editor Features

Add unlimited images

Accept PNG/JPG uploads (up to 10MB each)

Add text:

Font family (Google Fonts)

Font size

Stroke

Shadow

Curved text (optional)

Snap-to-grid (optional)

Undo / Redo

Delete layer

Reset design

Zoom/pan canvas

📌 3D Viewer Features

Rotate mug freely

Zoom with scroll

Change color of:

Mug body

Handle

Interior

Load texture from the 2D editor in real time

Render smooth shadows

Render glossy or matte material variation

🧱 Folder Structure Recommended
/src
  /components
    MugCustomizer/
      Editor2D.tsx
      Mug3D.tsx
      Toolbar.tsx
      Sidebar.tsx
      ExportModal.tsx
  /assets
    mugs/
      mug11oz.glb
      mug15oz.glb
    textures/
      base-print-area.png
/docs
  mug-customizer.md   <-- This file

🔌 Integration in Astro
---
import MugCustomizer from "../components/MugCustomizer/MugCustomizer";
---

<MugCustomizer client:only="react" />

🧪 Testing Requirements
Must work on:

Desktop Chrome, Safari, Firefox, Edge

Mobile (limited editing, full preview)

Performance:

3D scene < 2ms updates

No blocking UI on image upload

PNG export under 300ms

🔐 Security

Sanitize filenames

Compress user images before loading

Prevent malicious SVG uploads

Disable drag-drop outside canvas

📦 Future features (optional)

Export MP4 rotating mug

Multiple mug shapes

Add AI image generator for artwork

Save designs to user account

Templates marketplace