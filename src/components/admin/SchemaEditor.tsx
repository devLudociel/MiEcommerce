import { useState, useRef } from 'react';
import type {
  CustomizationSchema,
  CustomizationField,
  ProductCategory,
  FieldType,
  ColorSelectorConfig,
  SizeSelectorConfig,
  DropdownConfig,
} from '../../types/customization';
import { Plus, Trash2, GripVertical, Save, X, ChevronDown, ChevronUp, Upload, Loader } from 'lucide-react';
import { notify } from '../../lib/notifications';
import ColorSelectorConfigEditor from './config-editors/ColorSelectorConfigEditor';
import SizeSelectorConfigEditor from './config-editors/SizeSelectorConfigEditor';
import DropdownConfigEditor from './config-editors/DropdownConfigEditor';
import { storage, auth } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '../../lib/logger';

interface SchemaEditorProps {
  category: ProductCategory;
  initialSchema?: CustomizationSchema;
  onSave: (schema: CustomizationSchema) => void;
  onCancel: () => void;
}

const fieldTypeOptions: Array<{ value: FieldType; label: string; icon: string }> = [
  { value: 'color_selector', label: 'Selector de Colores', icon: '🎨' },
  { value: 'size_selector', label: 'Selector de Tallas', icon: '📏' },
  { value: 'dropdown', label: 'Lista Desplegable', icon: '📋' },
  { value: 'text_input', label: 'Campo de Texto', icon: '📝' },
  { value: 'image_upload', label: 'Subir Imagen', icon: '🖼️' },
  { value: 'card_selector', label: 'Selector Visual (Cards)', icon: '📦' },
  { value: 'checkbox', label: 'Checkbox', icon: '✅' },
  { value: 'radio_group', label: 'Radio Buttons', icon: '🔘' },
  { value: 'number_input', label: 'Campo Numérico', icon: '🔢' },
  { value: 'dimensions_input', label: 'Dimensiones (Alto x Ancho)', icon: '📐' },
];

export default function SchemaEditor({ category, initialSchema, onSave, onCancel }: SchemaEditorProps) {
  const [fields, setFields] = useState<CustomizationField[]>(initialSchema?.fields || []);
  const [showAddField, setShowAddField] = useState(false);
  const [expandedConfigs, setExpandedConfigs] = useState<Record<string, boolean>>({});
  const [defaultPreviewImage, setDefaultPreviewImage] = useState<string>(
    initialSchema?.previewImages?.default || ''
  );
  const [uploadingDefaultImage, setUploadingDefaultImage] = useState(false);
  const defaultImageInputRef = useRef<HTMLInputElement>(null);

  const handleAddField = () => {
    const newField: CustomizationField = {
      id: `field_${Date.now()}`,
      fieldType: 'text_input',
      label: 'Nuevo Campo',
      required: false,
      config: {},
      priceModifier: 0,
      order: fields.length,
    };

    setFields([...fields, newField]);
    setShowAddField(false);
  };

  const initializeFieldConfig = (fieldType: FieldType): any => {
    switch (fieldType) {
      case 'color_selector':
        return {
          displayStyle: 'color_blocks',
          availableColors: [],
        } as ColorSelectorConfig;
      case 'size_selector':
        return {
          displayStyle: 'buttons',
          availableSizes: [],
        } as SizeSelectorConfig;
      case 'dropdown':
        return {
          options: [],
        } as DropdownConfig;
      case 'image_upload':
        return {
          maxSizeMB: 5,
          allowedFormats: ['jpg', 'jpeg', 'png'],
          showPreview: true,
        };
      case 'card_selector':
        return {
          displayStyle: 'grid',
          options: [],
        };
      case 'radio_group':
        return {
          options: [],
        };
      case 'text_input':
        return {
          placeholder: '',
          maxLength: 100,
        };
      case 'number_input':
        return {
          min: 0,
          max: 999,
          step: 1,
        };
      case 'dimensions_input':
        return {
          minWidth: 10,
          maxWidth: 200,
          minHeight: 10,
          maxHeight: 200,
          unit: 'cm',
        };
      default:
        return {};
    }
  };

  const handleRemoveField = (fieldId: string) => {
    if (!confirm('¿Eliminar este campo?')) return;
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CustomizationField>) => {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;

        // If fieldType is changing, initialize the appropriate config
        if (updates.fieldType && updates.fieldType !== f.fieldType) {
          return {
            ...f,
            ...updates,
            config: initializeFieldConfig(updates.fieldType),
          };
        }

        return { ...f, ...updates };
      })
    );
  };

  const handleSave = () => {
    // Validation
    if (fields.length === 0) {
      notify.error('Debes agregar al menos un campo');
      return;
    }

    const hasEmptyLabels = fields.some((f) => !f.label.trim());
    if (hasEmptyLabels) {
      notify.error('Todos los campos deben tener un nombre');
      return;
    }

    const schema: CustomizationSchema = {
      fields: fields.map((f, idx) => ({ ...f, order: idx })),
      displayComponent: 'DynamicCustomizer',
      previewImages: {
        default: defaultPreviewImage || undefined,
      },
    };

    onSave(schema);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleUploadDefaultImage = async (file: File) => {
    const user = auth.currentUser;
    if (!user) {
      notify.error('Debes iniciar sesión para subir imágenes');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notify.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error('La imagen debe pesar menos de 5MB');
      return;
    }

    setUploadingDefaultImage(true);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `product-previews/${user.uid}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      logger.info('[SchemaEditor] Default preview image uploaded:', downloadURL);

      setDefaultPreviewImage(downloadURL);
      notify.success('Imagen subida correctamente');
    } catch (error) {
      logger.error('[SchemaEditor] Error uploading default preview image:', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploadingDefaultImage(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          ✏️ Editando Schema: {category.name}
        </h2>
        <p className="text-purple-100">
          Configura los campos de personalización que verán tus clientes
        </p>
      </div>

      {/* Editor */}
      <div className="p-6">
        {/* Preview Configuration */}
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <span>🖼️</span>
            Configuración de Preview Visual
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            Configura la imagen por defecto que se mostrará en el preview. Si tienes un campo de
            selector de colores, cada color puede tener su propia imagen.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen Preview por Defecto (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultPreviewImage}
                onChange={(e) => setDefaultPreviewImage(e.target.value)}
                placeholder="https://ejemplo.com/imagen-producto-default.jpg"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="file"
                ref={defaultImageInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadDefaultImage(file);
                }}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => defaultImageInputRef.current?.click()}
                disabled={uploadingDefaultImage}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Subir imagen desde PC"
              >
                {uploadingDefaultImage ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              💡 Sube una imagen desde tu PC o pega una URL. Esta imagen se mostrará cuando no haya un color seleccionado.
            </p>
          </div>
        </div>

        {/* Fields List */}
        <div className="space-y-4 mb-6">
          {fields.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-3">📋</div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No hay campos configurados</h3>
              <p className="text-gray-500 mb-4">Agrega tu primer campo para empezar</p>
              <button
                onClick={handleAddField}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ➕ Agregar Primer Campo
              </button>
            </div>
          ) : (
            <>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Mover arriba"
                      >
                        ▲
                      </button>
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <button
                        onClick={() => moveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Field Content */}
                    <div className="flex-1 space-y-3">
                      {/* Order & Type */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <select
                          value={field.fieldType}
                          onChange={(e) =>
                            handleUpdateField(field.id, { fieldType: e.target.value as FieldType })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {fieldTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.icon} {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Label */}
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="Nombre del campo (ej: Color de la camiseta)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                      />

                      {/* Options Row */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                            className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Obligatorio</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">Precio extra:</label>
                          <input
                            type="number"
                            value={field.priceModifier}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                priceModifier: parseFloat(e.target.value) || 0,
                              })
                            }
                            min="0"
                            step="0.01"
                            className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-600">€</span>
                        </div>
                      </div>

                      {/* Help Text */}
                      <input
                        type="text"
                        value={field.helpText || ''}
                        onChange={(e) => handleUpdateField(field.id, { helpText: e.target.value })}
                        placeholder="Texto de ayuda (opcional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />

                      {/* Advanced Configuration */}
                      {(field.fieldType === 'color_selector' ||
                        field.fieldType === 'size_selector' ||
                        field.fieldType === 'dropdown') && (
                        <div className="border-t border-gray-200 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedConfigs({
                                ...expandedConfigs,
                                [field.id]: !expandedConfigs[field.id],
                              })
                            }
                            className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                          >
                            {expandedConfigs[field.id] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            ⚙️ Configuración Avanzada
                          </button>

                          {expandedConfigs[field.id] && (
                            <div className="mt-3 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                              {field.fieldType === 'color_selector' && (
                                <ColorSelectorConfigEditor
                                  colors={
                                    (field.config as ColorSelectorConfig).availableColors || []
                                  }
                                  onChange={(colors) =>
                                    handleUpdateField(field.id, {
                                      config: {
                                        ...(field.config as ColorSelectorConfig),
                                        availableColors: colors,
                                      },
                                    })
                                  }
                                />
                              )}

                              {field.fieldType === 'size_selector' && (
                                <SizeSelectorConfigEditor
                                  sizes={(field.config as SizeSelectorConfig).availableSizes || []}
                                  onChange={(sizes) =>
                                    handleUpdateField(field.id, {
                                      config: {
                                        ...(field.config as SizeSelectorConfig),
                                        availableSizes: sizes,
                                      },
                                    })
                                  }
                                />
                              )}

                              {field.fieldType === 'dropdown' && (
                                <DropdownConfigEditor
                                  options={(field.config as DropdownConfig).options || []}
                                  onChange={(options) =>
                                    handleUpdateField(field.id, {
                                      config: {
                                        ...(field.config as DropdownConfig),
                                        options: options,
                                      },
                                    })
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveField(field.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar campo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Field Button */}
              <button
                onClick={handleAddField}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all font-medium"
              >
                ➕ Agregar Campo
              </button>
            </>
          )}
        </div>

        {/* Summary */}
        {fields.length > 0 && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-bold text-purple-900 mb-2">📊 Resumen</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-purple-700 font-medium">Total campos:</div>
                <div className="text-2xl font-bold text-purple-900">{fields.length}</div>
              </div>
              <div>
                <div className="text-purple-700 font-medium">Obligatorios:</div>
                <div className="text-2xl font-bold text-purple-900">
                  {fields.filter((f) => f.required).length}
                </div>
              </div>
              <div>
                <div className="text-purple-700 font-medium">Con precio extra:</div>
                <div className="text-2xl font-bold text-purple-900">
                  {fields.filter((f) => f.priceModifier > 0).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Schema
          </button>
        </div>
      </div>
    </div>
  );
}
