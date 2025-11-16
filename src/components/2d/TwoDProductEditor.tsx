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

type Tool = 'select' | 'move' | 'rotate' | 'scale';

export default function TwoDProductEditor({
  productType = 'mug',
  imageUrl,
  onDesignChange,
  backgroundColor = '#f5f5f5'
}: TwoDProductEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<DesignState[]>([design]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drag state
  const dragStartRef = useRef({ x: 0, y: 0, designX: 0, designY: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Cargar imagen
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        // Ajustar tamaño inicial del diseño basado en la imagen
        const aspectRatio = img.width / img.height;
        const initialWidth = Math.min(template.printAreaWidth * 0.8, 200);
        const initialHeight = initialWidth / aspectRatio;

        setDesign(prev => ({
          ...prev,
          width: initialWidth,
          height: initialHeight
        }));
      };
      img.src = imageUrl;
    }
  }, [imageUrl, template.printAreaWidth]);

  // Notificar cambios
  useEffect(() => {
    onDesignChange?.(design);
  }, [design, onDesignChange]);

  // Renderizar canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Aplicar zoom
    ctx.scale(zoom, zoom);

    // Dibujar fondo del producto
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 2;
    ctx.fillRect(0, 0, template.width, template.height);
    ctx.strokeRect(0, 0, template.width, template.height);

    // Dibujar grid si está activado
    if (showGrid) {
      ctx.strokeStyle = '#e8e8e8';
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
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.fillRect(
      template.printAreaX,
      template.printAreaY,
      template.printAreaWidth,
      template.printAreaHeight
    );
    ctx.strokeRect(
      template.printAreaX,
      template.printAreaY,
      template.printAreaWidth,
      template.printAreaHeight
    );
    ctx.setLineDash([]);

    // Etiqueta del área de impresión
    ctx.fillStyle = '#3b82f6';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'Área de impresión',
      template.printAreaX + 10,
      template.printAreaY + 20
    );

    // Dibujar guías si están activadas
    if (showGuides) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Guía vertical central
      const centerX = template.printAreaX + template.printAreaWidth / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, template.printAreaY);
      ctx.lineTo(centerX, template.printAreaY + template.printAreaHeight);
      ctx.stroke();

      // Guía horizontal central
      const centerY = template.printAreaY + template.printAreaHeight / 2;
      ctx.beginPath();
      ctx.moveTo(template.printAreaX, centerY);
      ctx.lineTo(template.printAreaX + template.printAreaWidth, centerY);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Dibujar imagen del diseño si existe
    if (imageRef.current) {
      ctx.save();

      // Transformar al punto de origen del diseño
      ctx.translate(design.x, design.y);
      ctx.rotate((design.rotation * Math.PI) / 180);
      ctx.scale(design.scale, design.scale);

      // Dibujar imagen centrada
      const drawWidth = design.width;
      const drawHeight = design.height;

      ctx.drawImage(
        imageRef.current,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      // Dibujar borde de selección
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.setLineDash([]);

      // Dibujar handles de esquina
      const handleSize = 8 / zoom;
      ctx.fillStyle = '#10b981';

      // Esquinas
      const corners = [
        [-drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, -drawHeight / 2],
        [drawWidth / 2, drawHeight / 2],
        [-drawWidth / 2, drawHeight / 2]
      ];

      corners.forEach(([x, y]) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      });

      // Handle de rotación (arriba)
      ctx.beginPath();
      ctx.arc(0, -drawHeight / 2 - 20 / zoom, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }, [design, template, showGrid, showGuides, zoom]);

  // Renderizar cuando cambie el estado
  useEffect(() => {
    render();
  }, [render]);

  // Manejo de mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Guardar posición inicial para drag
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
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;

    setDesign(prev => ({
      ...prev,
      x: dragStartRef.current.designX + dx,
      y: dragStartRef.current.designY + dy
    }));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Guardar en historial
      setHistory(prev => [...prev.slice(0, historyIndex + 1), design]);
      setHistoryIndex(prev => prev + 1);
    }
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

  const resetRotation = () => {
    setDesign(prev => ({ ...prev, rotation: 0 }));
  };

  const resetScale = () => {
    setDesign(prev => ({ ...prev, scale: 1 }));
  };

  const flipHorizontal = () => {
    setDesign(prev => ({ ...prev, scale: -prev.scale }));
  };

  const rotateLeft = () => {
    setDesign(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  };

  const rotateRight = () => {
    setDesign(prev => ({ ...prev, rotation: prev.rotation + 90 }));
  };

  const scaleUp = () => {
    setDesign(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }));
  };

  const scaleDown = () => {
    setDesign(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.1) }));
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setDesign(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setDesign(history[historyIndex + 1]);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: backgroundColor,
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Barra de herramientas superior */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* Información del producto */}
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          borderRight: '1px solid #e5e7eb',
          paddingRight: '12px'
        }}>
          {template.label}
        </div>

        {/* Herramientas de alineación */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={centerDesign}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Centrar diseño"
          >
            📍 Centrar
          </button>

          <button
            onClick={rotateLeft}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Rotar -90°"
          >
            ↺ -90°
          </button>

          <button
            onClick={rotateRight}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Rotar +90°"
          >
            ↻ +90°
          </button>

          <button
            onClick={resetRotation}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Resetear rotación"
          >
            🔄 Reset
          </button>
        </div>

        {/* Herramientas de escala */}
        <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e5e7eb', paddingLeft: '12px' }}>
          <button
            onClick={scaleDown}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Reducir tamaño"
          >
            🔍− Reducir
          </button>

          <button
            onClick={scaleUp}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Aumentar tamaño"
          >
            🔍+ Ampliar
          </button>

          <button
            onClick={resetScale}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            title="Tamaño original"
          >
            100%
          </button>
        </div>

        {/* Controles de vista */}
        <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e5e7eb', paddingLeft: '12px' }}>
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{
              padding: '8px 12px',
              background: showGrid ? '#3b82f6' : '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: showGrid ? '#ffffff' : '#374151'
            }}
            title="Mostrar/ocultar grid"
          >
            # Grid
          </button>

          <button
            onClick={() => setShowGuides(!showGuides)}
            style={{
              padding: '8px 12px',
              background: showGuides ? '#3b82f6' : '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: showGuides ? '#ffffff' : '#374151'
            }}
            title="Mostrar/ocultar guías"
          >
            + Guías
          </button>
        </div>

        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            style={{
              padding: '8px 12px',
              background: historyIndex === 0 ? '#f3f4f6' : '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: historyIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: historyIndex === 0 ? '#9ca3af' : '#ffffff',
              opacity: historyIndex === 0 ? 0.5 : 1
            }}
            title="Deshacer"
          >
            ↶ Deshacer
          </button>

          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            style={{
              padding: '8px 12px',
              background: historyIndex >= history.length - 1 ? '#f3f4f6' : '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: historyIndex >= history.length - 1 ? '#9ca3af' : '#ffffff',
              opacity: historyIndex >= history.length - 1 ? 0.5 : 1
            }}
            title="Rehacer"
          >
            ↷ Rehacer
          </button>
        </div>
      </div>

      {/* Canvas área */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto'
      }}>
        <canvas
          ref={canvasRef}
          width={template.width * zoom}
          height={template.height * zoom}
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: '#ffffff'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Panel de información inferior */}
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        color: '#6b7280',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <strong>Posición:</strong> X: {Math.round(design.x)}px, Y: {Math.round(design.y)}px
        </div>
        <div>
          <strong>Tamaño:</strong> {Math.round(design.width * design.scale)} × {Math.round(design.height * design.scale)}px
        </div>
        <div>
          <strong>Rotación:</strong> {Math.round(design.rotation)}°
        </div>
        <div>
          <strong>Escala:</strong> {Math.round(design.scale * 100)}%
        </div>
        <div style={{ marginLeft: 'auto', color: '#10b981', fontWeight: '500' }}>
          💡 Arrastra el diseño para moverlo
        </div>
      </div>
    </div>
  );
}
