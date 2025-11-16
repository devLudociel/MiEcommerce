import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TwoDProductEditorProps {
  productType?: 'mug' | 'thermos' | 'bottle';
  imageUrl?: string;
  onDesignChange?: (design: DesignState) => void;
  backgroundColor?: string;
}

interface DesignState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

interface ProductTemplate {
  width: number;
  height: number;
  printAreaX: number;
  printAreaY: number;
  printAreaWidth: number;
  printAreaHeight: number;
  label: string;
}

const PRODUCT_TEMPLATES: Record<string, ProductTemplate> = {
  mug: {
    width: 600,
    height: 400,
    printAreaX: 150,
    printAreaY: 100,
    printAreaWidth: 300,
    printAreaHeight: 200,
    label: 'Taza'
  },
  thermos: {
    width: 400,
    height: 700,
    printAreaX: 80,
    printAreaY: 200,
    printAreaWidth: 240,
    printAreaHeight: 300,
    label: 'Termo'
  },
  bottle: {
    width: 350,
    height: 600,
    printAreaX: 75,
    printAreaY: 150,
    printAreaWidth: 200,
    printAreaHeight: 300,
    label: 'Botella'
  }
};

export default function TwoDProductEditor({
  productType = 'mug',
  imageUrl,
  onDesignChange,
  backgroundColor = '#f5f5f5'
}: TwoDProductEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const template = PRODUCT_TEMPLATES[productType];

  // Estado del diseño
  const [design, setDesign] = useState<DesignState>({
    x: template.printAreaX + template.printAreaWidth / 2,
    y: template.printAreaY + template.printAreaHeight / 2,
    width: 200,
    height: 200,
    rotation: 0,
    scale: 1
  });

  // Estados de UI
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null);

  // Drag state
  const dragStartRef = useRef({ x: 0, y: 0, designX: 0, designY: 0 });

  // Cargar imagen cuando cambie imageUrl
  useEffect(() => {
    console.log('[TwoDProductEditor] imageUrl changed:', imageUrl);

    if (!imageUrl) {
      setDesignImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('[TwoDProductEditor] Image loaded successfully:', img.width, 'x', img.height);
      setDesignImage(img);

      // Ajustar tamaño inicial
      const aspectRatio = img.width / img.height;
      const initialWidth = Math.min(template.printAreaWidth * 0.6, 200);
      const initialHeight = initialWidth / aspectRatio;

      setDesign(prev => ({
        ...prev,
        width: initialWidth,
        height: initialHeight
      }));
    };

    img.onerror = (e) => {
      console.error('[TwoDProductEditor] Error loading image:', e);
      setDesignImage(null);
    };

    img.src = imageUrl;
  }, [imageUrl, template.printAreaWidth]);

  // Renderizar canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('[TwoDProductEditor] Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[TwoDProductEditor] Canvas context not available');
      return;
    }

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar fondo del producto
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, template.width, template.height);
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, template.width, template.height);

    // Dibujar grid
    if (showGrid) {
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      const gridSize = 20;

      for (let x = 0; x <= template.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, template.height);
        ctx.stroke();
      }

      for (let y = 0; y <= template.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(template.width, y);
        ctx.stroke();
      }
    }

    // Dibujar área de impresión
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(
      template.printAreaX,
      template.printAreaY,
      template.printAreaWidth,
      template.printAreaHeight
    );

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(
      template.printAreaX,
      template.printAreaY,
      template.printAreaWidth,
      template.printAreaHeight
    );
    ctx.setLineDash([]);

    // Etiqueta del área de impresión
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Área de impresión', template.printAreaX + 10, template.printAreaY + 25);

    // Dibujar guías
    if (showGuides) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const centerX = template.printAreaX + template.printAreaWidth / 2;
      const centerY = template.printAreaY + template.printAreaHeight / 2;

      ctx.beginPath();
      ctx.moveTo(centerX, template.printAreaY);
      ctx.lineTo(centerX, template.printAreaY + template.printAreaHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(template.printAreaX, centerY);
      ctx.lineTo(template.printAreaX + template.printAreaWidth, centerY);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Dibujar imagen si existe
    if (designImage) {
      ctx.save();

      ctx.translate(design.x, design.y);
      ctx.rotate((design.rotation * Math.PI) / 180);
      ctx.scale(design.scale, design.scale);

      const drawWidth = design.width;
      const drawHeight = design.height;

      // Dibujar imagen
      ctx.drawImage(
        designImage,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      // Dibujar borde de selección
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.setLineDash([]);

      // Dibujar handles
      const handleSize = 10;
      ctx.fillStyle = '#10b981';

      const corners = [
        [-drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, drawHeight / 2],
        [-drawWidth / 2, drawHeight / 2]
      ];

      corners.forEach(([x, y]) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      });

      ctx.restore();
    }
  }, [template, design, designImage, showGrid, showGuides]);

  // Ejecutar render cuando cambien las dependencias
  useEffect(() => {
    console.log('[TwoDProductEditor] Rendering canvas');
    renderCanvas();
  }, [renderCanvas]);

  // Notificar cambios
  useEffect(() => {
    onDesignChange?.(design);
  }, [design, onDesignChange]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragStartRef.current = {
      x,
      y,
      designX: design.x,
      designY: design.y
    };

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

    setDesign(prev => ({
      ...prev,
      x: dragStartRef.current.designX + dx,
      y: dragStartRef.current.designY + dy
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Funciones de herramientas
  const centerDesign = () => {
    setDesign(prev => ({
      ...prev,
      x: template.printAreaX + template.printAreaWidth / 2,
      y: template.printAreaY + template.printAreaHeight / 2
    }));
  };

  const rotateLeft = () => {
    setDesign(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  };

  const rotateRight = () => {
    setDesign(prev => ({ ...prev, rotation: prev.rotation + 90 }));
  };

  const resetRotation = () => {
    setDesign(prev => ({ ...prev, rotation: 0 }));
  };

  const scaleUp = () => {
    setDesign(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }));
  };

  const scaleDown = () => {
    setDesign(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.1) }));
  };

  const resetScale = () => {
    setDesign(prev => ({ ...prev, scale: 1 }));
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: backgroundColor,
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Barra de herramientas */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginRight: '12px',
          paddingRight: '12px',
          borderRight: '1px solid #e5e7eb'
        }}>
          {template.label}
        </div>

        <button onClick={centerDesign} style={buttonStyle}>📍 Centrar</button>
        <button onClick={rotateLeft} style={buttonStyle}>↺ -90°</button>
        <button onClick={rotateRight} style={buttonStyle}>↻ +90°</button>
        <button onClick={resetRotation} style={buttonStyle}>🔄 Reset</button>

        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 8px' }} />

        <button onClick={scaleDown} style={buttonStyle}>🔍− Reducir</button>
        <button onClick={scaleUp} style={buttonStyle}>🔍+ Ampliar</button>
        <button onClick={resetScale} style={buttonStyle}>100%</button>

        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 8px' }} />

        <button
          onClick={() => setShowGrid(!showGrid)}
          style={{
            ...buttonStyle,
            background: showGrid ? '#3b82f6' : '#f3f4f6',
            color: showGrid ? '#ffffff' : '#374151'
          }}
        >
          # Grid
        </button>

        <button
          onClick={() => setShowGuides(!showGuides)}
          style={{
            ...buttonStyle,
            background: showGuides ? '#3b82f6' : '#f3f4f6',
            color: showGuides ? '#ffffff' : '#374151'
          }}
        >
          + Guías
        </button>
      </div>

      {/* Canvas área */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
        background: '#fafafa'
      }}>
        <canvas
          ref={canvasRef}
          width={template.width}
          height={template.height}
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: '#ffffff',
            maxWidth: '100%',
            height: 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Panel de información */}
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        gap: '16px',
        fontSize: '13px',
        color: '#6b7280',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
        flexWrap: 'wrap'
      }}>
        {designImage ? (
          <>
            <div><strong>Posición:</strong> X: {Math.round(design.x)}px, Y: {Math.round(design.y)}px</div>
            <div><strong>Tamaño:</strong> {Math.round(design.width * design.scale)} × {Math.round(design.height * design.scale)}px</div>
            <div><strong>Rotación:</strong> {Math.round(design.rotation)}°</div>
            <div><strong>Escala:</strong> {Math.round(design.scale * 100)}%</div>
            <div style={{ marginLeft: 'auto', color: '#10b981', fontWeight: '500' }}>
              💡 Arrastra para mover el diseño
            </div>
          </>
        ) : (
          <div style={{ color: '#9ca3af' }}>
            📤 Carga una imagen para empezar a diseñar
          </div>
        )}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: '#f3f4f6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  transition: 'all 0.2s'
};
