import React, { useState, useRef, useEffect } from 'react';
import ThreeDMugPreview from './ThreeDMugPreview';

interface ProductCustomizerProps {
  productType?: 'mug' | 'thermos' | 'bottle';
  onSave?: (config: CustomizationConfig) => void;
}

interface CustomizationConfig {
  productColor: string;
  imageUrl: string;
  designPosition: { x: number; y: number };
  designSize: { width: number; height: number };
  designRotation: number;
}

// Colores predefinidos para productos
const PRODUCT_COLORS = [
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Negro', value: '#1a1a1a' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Naranja', value: '#f97316' },
];

// Dimensiones del área de impresión (en mm convertido a px a 96 DPI)
const PRINT_AREA_MM = {
  width: 210,  // mm
  height: 95   // mm
};

// Convertir mm a px (96 DPI = 3.7795 px/mm aprox)
const MM_TO_PX = 3.7795;
const PRINT_AREA_PX = {
  width: Math.round(PRINT_AREA_MM.width * MM_TO_PX),   // ~794px
  height: Math.round(PRINT_AREA_MM.height * MM_TO_PX)  // ~359px
};

export default function ProductCustomizer({
  productType = 'mug',
  onSave
}: ProductCustomizerProps) {
  const [productColor, setProductColor] = useState('#ffffff');
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [designPosition, setDesignPosition] = useState({ x: PRINT_AREA_PX.width / 2, y: PRINT_AREA_PX.height / 2 });
  const [designSize, setDesignSize] = useState({ width: 200, height: 200 });
  const [designRotation, setDesignRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, designX: 0, designY: 0 });

  // Renderizar canvas 2D
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar
    ctx.clearRect(0, 0, PRINT_AREA_PX.width, PRINT_AREA_PX.height);

    // Fondo del área de impresión
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, PRINT_AREA_PX.width, PRINT_AREA_PX.height);

    // Borde
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, PRINT_AREA_PX.width, PRINT_AREA_PX.height);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = 0; x <= PRINT_AREA_PX.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PRINT_AREA_PX.height);
      ctx.stroke();
    }

    for (let y = 0; y <= PRINT_AREA_PX.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PRINT_AREA_PX.width, y);
      ctx.stroke();
    }

    // Líneas centrales
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(PRINT_AREA_PX.width / 2, 0);
    ctx.lineTo(PRINT_AREA_PX.width / 2, PRINT_AREA_PX.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, PRINT_AREA_PX.height / 2);
    ctx.lineTo(PRINT_AREA_PX.width, PRINT_AREA_PX.height / 2);
    ctx.stroke();

    ctx.setLineDash([]);

    // Dimensiones en las esquinas
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${PRINT_AREA_MM.width}mm × ${PRINT_AREA_MM.height}mm`, 10, 20);

    // Dibujar imagen si existe
    if (loadedImageRef.current) {
      ctx.save();

      ctx.translate(designPosition.x, designPosition.y);
      ctx.rotate((designRotation * Math.PI) / 180);

      const drawWidth = designSize.width;
      const drawHeight = designSize.height;

      ctx.drawImage(
        loadedImageRef.current,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      // Borde de selección
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.setLineDash([]);

      // Handles
      const handleSize = 8;
      ctx.fillStyle = '#10b981';

      [
        [-drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, drawHeight / 2],
        [-drawWidth / 2, drawHeight / 2]
      ].forEach(([x, y]) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      });

      ctx.restore();
    }
  };

  // Renderizar cuando cambien las propiedades
  useEffect(() => {
    renderCanvas();
  }, [designImage, designPosition, designSize, designRotation]);

  // Cargar imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;

        // Ajustar tamaño inicial
        const aspectRatio = img.width / img.height;
        const initialWidth = Math.min(PRINT_AREA_PX.width * 0.6, 300);
        const initialHeight = initialWidth / aspectRatio;

        setDesignSize({ width: initialWidth, height: initialHeight });
        setDesignImage(event.target?.result as string);
        renderCanvas();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Mouse events para arrastrar
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loadedImageRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragStartRef.current = { x, y, designX: designPosition.x, designY: designPosition.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;

    setDesignPosition({
      x: dragStartRef.current.designX + dx,
      y: dragStartRef.current.designY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Funciones de control
  const centerDesign = () => {
    setDesignPosition({ x: PRINT_AREA_PX.width / 2, y: PRINT_AREA_PX.height / 2 });
  };

  const rotateDesign = (degrees: number) => {
    setDesignRotation(prev => prev + degrees);
  };

  const scaleDesign = (factor: number) => {
    setDesignSize(prev => ({
      width: Math.max(50, Math.min(PRINT_AREA_PX.width, prev.width * factor)),
      height: Math.max(50, Math.min(PRINT_AREA_PX.height, prev.height * factor))
    }));
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      padding: '24px',
      background: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Panel Izquierdo - Vista 3D */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '24px'
        }}>
          Vista 3D
        </h2>

        {/* Selector de color */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px'
          }}>
            Color del Producto
          </label>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}>
            {PRODUCT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setProductColor(color.value)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  border: productColor === color.value ? '3px solid #10b981' : '2px solid #d1d5db',
                  background: color.value,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: productColor === color.value ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Vista 3D */}
        <div style={{ marginTop: '24px' }}>
          <ThreeDMugPreview
            imageUrl={designImage || undefined}
            productType={productType}
            productColor={productColor}
            autoRotate={true}
            backgroundColor="#fafafa"
          />
        </div>
      </div>

      {/* Panel Derecho - Editor 2D */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '24px'
        }}>
          Editor de Diseño
        </h2>

        {/* Upload de imagen */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            padding: '16px',
            background: '#3b82f6',
            color: '#ffffff',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            📤 Subir Imagen
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Área de edición 2D */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px'
          }}>
            Área de Impresión (210mm × 95mm)
          </label>

          <canvas
            ref={canvasRef}
            width={PRINT_AREA_PX.width}
            height={PRINT_AREA_PX.height}
            style={{
              width: '100%',
              height: 'auto',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Controles */}
        {designImage && (
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}>
              Controles
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              <button onClick={centerDesign} style={buttonStyle}>📍 Centrar</button>
              <button onClick={() => rotateDesign(90)} style={buttonStyle}>↻ Rotar 90°</button>
              <button onClick={() => scaleDesign(1.1)} style={buttonStyle}>🔍+ Ampliar</button>
              <button onClick={() => scaleDesign(0.9)} style={buttonStyle}>🔍− Reducir</button>
            </div>

            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#e0f2fe',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#075985'
            }}>
              <strong>Posición:</strong> X: {Math.round(designPosition.x)}px, Y: {Math.round(designPosition.y)}px<br/>
              <strong>Tamaño:</strong> {Math.round(designSize.width)} × {Math.round(designSize.height)}px<br/>
              <strong>Rotación:</strong> {Math.round(designRotation)}°
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#f3f4f6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  transition: 'all 0.2s'
};
