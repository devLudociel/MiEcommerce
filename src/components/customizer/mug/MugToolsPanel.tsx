// src/components/customizer/mug/MugToolsPanel.tsx

import React, { useState } from 'react';
import {
  Type,
  Users,
  Upload,
  Shapes,
  Palette,
  Layout,
  Grid3x3,
  Pipette,
  X,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import type { MugTool, MugDesignElement } from './types';
import { MUG_TEMPLATES, MUG_CLIPARTS, MUG_FONTS, TEXT_COLORS } from './mugConfig';

interface MugToolsPanelProps {
  activeTool: MugTool | null;
  onToolSelect: (tool: MugTool | null) => void;
  onAddElement: (element: Partial<MugDesignElement>) => void;
  onTemplateSelect?: (templateId: string) => void;
}

export default function MugToolsPanel({
  activeTool,
  onToolSelect,
  onAddElement,
  onTemplateSelect,
}: MugToolsPanelProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(24);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  const [backgroundColorInput, setBackgroundColorInput] = useState('#FFFFFF');

  const tools: Array<{
    id: MugTool;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
  }> = [
    { id: 'text', icon: Type, label: 'Texto', color: 'bg-blue-100 text-blue-600' },
    { id: 'names', icon: Users, label: 'Nombres', color: 'bg-green-100 text-green-600' },
    {
      id: 'uploads',
      icon: Upload,
      label: 'Archivos subidos',
      color: 'bg-purple-100 text-purple-600',
    },
    { id: 'graphics', icon: Shapes, label: 'Gráficos', color: 'bg-pink-100 text-pink-600' },
    { id: 'background', icon: Palette, label: 'Fondo', color: 'bg-yellow-100 text-yellow-600' },
    { id: 'template', icon: Layout, label: 'Plantilla', color: 'bg-indigo-100 text-indigo-600' },
    { id: 'tables', icon: Grid3x3, label: 'Tablas', color: 'bg-cyan-100 text-cyan-600' },
    {
      id: 'color',
      icon: Pipette,
      label: 'Color de la plantilla',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  const handleAddText = () => {
    if (!textInput.trim()) return;

    const newTextElement: Partial<MugDesignElement> = {
      type: 'text',
      x: 50,
      y: 50,
      width: 40,
      height: 10,
      rotation: 0,
      zIndex: 10,
      text: textInput,
      fontSize,
      fontFamily: selectedFont,
      color: selectedColor,
      bold: isBold,
      italic: isItalic,
      align: textAlign,
    };

    onAddElement(newTextElement);
    setTextInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      const newImageElement: Partial<MugDesignElement> = {
        type: 'image',
        x: 50,
        y: 50,
        width: 30,
        height: 30,
        rotation: 0,
        zIndex: 5,
        imageData,
      };
      onAddElement(newImageElement);
    };
    reader.readAsDataURL(file);
  };

  const handleAddClipart = (clipart: { imageUrl: string; name?: string; category?: string }) => {
    const newClipartElement: Partial<MugDesignElement> = {
      type: 'clipart',
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      rotation: 0,
      zIndex: 5,
      imageUrl: clipart.imageUrl,
    };
    onAddElement(newClipartElement);
  };

  const handleSetBackground = () => {
    const newBgElement: Partial<MugDesignElement> = {
      type: 'background',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      backgroundColor: backgroundColorInput,
    };
    onAddElement(newBgElement);
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'text':
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texto</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe tu texto aquí..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fuente</label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {MUG_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color.value
                        ? 'border-purple-500 scale-110'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsBold(!isBold)}
                className={`flex-1 py-2 px-4 rounded-lg font-bold border-2 transition-colors ${
                  isBold
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                B
              </button>
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`flex-1 py-2 px-4 rounded-lg italic border-2 transition-colors ${
                  isItalic
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                I
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTextAlign('left')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  textAlign === 'left'
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⬅
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  textAlign === 'center'
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ↔
              </button>
              <button
                onClick={() => setTextAlign('right')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  textAlign === 'right'
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ➡
              </button>
            </div>

            <button
              onClick={handleAddText}
              disabled={!textInput.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Agregar Texto
            </button>
          </div>
        );

      case 'uploads':
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sube tu imagen</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Haz clic o arrastra tu imagen aquí</p>
                  <p className="text-sm text-gray-500 mt-2">JPG, PNG, SVG • Máx 10MB</p>
                </label>
              </div>
            </div>
          </div>
        );

      case 'graphics':
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliparts y Gráficos
              </label>
              <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {MUG_CLIPARTS.map((clipart) => (
                  <button
                    key={clipart.id}
                    onClick={() => handleAddClipart(clipart)}
                    className="aspect-square border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all p-2 bg-white"
                    title={clipart.name}
                  >
                    <img
                      src={clipart.imageUrl}
                      alt={clipart.name}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'background':
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color de Fondo</label>
              <input
                type="color"
                value={backgroundColorInput}
                onChange={(e) => setBackgroundColorInput(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>
            <button
              onClick={handleSetBackground}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Palette className="w-5 h-5" />
              Aplicar Fondo
            </button>
          </div>
        );

      case 'template':
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plantillas Predefinidas
              </label>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {MUG_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onTemplateSelect?.(template.id)}
                    className="w-full border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all p-3 bg-white text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{template.name}</h4>
                        <p className="text-xs text-gray-500">{template.category}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'names':
        return (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Funcionalidad de nombres múltiples en desarrollo...
            </p>
          </div>
        );

      case 'tables':
        return (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">Funcionalidad de tablas en desarrollo...</p>
          </div>
        );

      case 'color':
        return (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Funcionalidad de color de plantilla en desarrollo...
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Tool Icons Bar */}
      <div className="w-24 bg-gray-50 border-r border-gray-200 flex flex-col py-4 gap-2">
        <div className="text-center text-xs font-semibold text-gray-500 mb-2 px-2">
          Opciones del producto
        </div>
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(isActive ? null : tool.id)}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-all mx-2 ${
                isActive
                  ? 'bg-gradient-to-br from-purple-100 to-cyan-100 shadow-md'
                  : 'hover:bg-gray-100'
              }`}
              title={tool.label}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isActive ? tool.color : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-gray-700 font-medium text-center leading-tight">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tool Content Panel */}
      {activeTool && (
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
            <h3 className="font-bold text-gray-800">
              {tools.find((t) => t.id === activeTool)?.label}
            </h3>
            <button
              onClick={() => onToolSelect(null)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {renderToolContent()}
        </div>
      )}
    </div>
  );
}
