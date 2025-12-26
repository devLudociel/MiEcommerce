/**
 * App de prueba para el Editor Interactivo
 * Permite testear todas las funcionalidades sin afectar personalizadores
 */

import React, { useState } from 'react';
import { Upload, Download, Trash2, Info } from 'lucide-react';
import InteractiveImageEditor from '../customizer/InteractiveImageEditor';
import type { ImageTransform } from '../../types/customization';

export default function TestInteractiveEditorApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  });

  // Imagen de producto de ejemplo (taza)
  const productImage =
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        // Reset transform
        setImageTransform({
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageTransform({
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    });
  };

  const handleExport = () => {
    const data = {
      image: uploadedImage,
      transform: imageTransform,
    };
    console.log('📦 Exported data:', data);
    alert(
      `✅ Datos exportados a consola!\n\nTransform:\nX: ${Math.round(imageTransform.x)}%\nY: ${Math.round(imageTransform.y)}%\nEscala: ${Math.round(imageTransform.scale * 100)}%\nRotación: ${Math.round(imageTransform.rotation)}°`
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!uploadedImage ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 shadow-lg">
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center hover:border-purple-500 hover:bg-purple-50 transition-all">
              <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Haz click para subir una imagen de prueba
              </p>
              <p className="text-gray-500">PNG, JPG, GIF (cualquier tamaño)</p>
            </div>
          </label>
        </div>
      ) : (
        <>
          {/* Editor */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Editor Interactivo</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  title="Exportar valores a consola"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  title="Eliminar imagen y empezar de nuevo"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </button>
              </div>
            </div>

            <InteractiveImageEditor
              image={uploadedImage}
              transform={imageTransform}
              onChange={setImageTransform}
              productImage={productImage}
              disabled={false}
            />
          </div>

          {/* Info Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transform Values */}
            <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                Valores Actuales
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">transform.x</span>
                  <span className="font-bold text-gray-800">{imageTransform.x.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">transform.y</span>
                  <span className="font-bold text-gray-800">{imageTransform.y.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">transform.scale</span>
                  <span className="font-bold text-gray-800">{imageTransform.scale.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">transform.rotation</span>
                  <span className="font-bold text-gray-800">
                    {imageTransform.rotation.toFixed(2)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Testing Checklist */}
            <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Checklist de Pruebas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test1" />
                  <label htmlFor="test1" className="text-gray-700">
                    <strong>Desktop:</strong> Drag & drop para mover imagen
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test2" />
                  <label htmlFor="test2" className="text-gray-700">
                    <strong>Desktop:</strong> Resize con handles morados
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test3" />
                  <label htmlFor="test3" className="text-gray-700">
                    <strong>Desktop:</strong> Rotación con handle cyan
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test4" />
                  <label htmlFor="test4" className="text-gray-700">
                    <strong>Desktop:</strong> Undo con botón o Ctrl+Z
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test5" />
                  <label htmlFor="test5" className="text-gray-700">
                    <strong>Desktop:</strong> Redo con botón o Ctrl+Y
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test6" />
                  <label htmlFor="test6" className="text-gray-700">
                    <strong>Desktop:</strong> Botón Resetear vuelve a default
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test7" />
                  <label htmlFor="test7" className="text-gray-700">
                    <strong>Móvil:</strong> Drag con 1 dedo mueve imagen
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test8" />
                  <label htmlFor="test8" className="text-gray-700">
                    <strong>Móvil:</strong> Pinch con 2 dedos escala imagen
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test9" />
                  <label htmlFor="test9" className="text-gray-700">
                    Stats se actualizan en tiempo real
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" id="test10" />
                  <label htmlFor="test10" className="text-gray-700">
                    Grid de ayuda visible en canvas
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border-2 border-purple-300 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">💬 ¿Qué te parece el editor?</h3>
            <p className="text-gray-700 mb-4">
              Compara esta experiencia con usar sliders. ¿Es más rápido? ¿Más intuitivo? ¿Funciona
              bien en móvil?
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">
                👍 Me encanta
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">
                👌 Está bien
              </button>
              <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium">
                🤔 Necesita mejoras
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
                👎 Prefiero sliders
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
