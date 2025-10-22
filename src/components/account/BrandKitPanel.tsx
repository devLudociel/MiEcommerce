import { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { storage, db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface BrandIdentity {
  brandName: string;
  description: string;
  guidelines: string;
}

interface BrandLogo {
  id: string;
  name: string;
  url: string;
  path: string;
  type: string;
}

interface BrandColor {
  id: string;
  hex: string;
  name: string;
}

interface BrandFont {
  id: string;
  name: string;
  type: 'title' | 'subtitle' | 'body';
  fontFamily: string;
}

interface BrandKitData {
  identity: BrandIdentity;
  logos: BrandLogo[];
  colors: BrandColor[];
  fonts: BrandFont[];
  createdAt: string;
  updatedAt: string;
}

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
  'Raleway', 'Playfair Display', 'Merriweather', 'Oswald', 'Source Sans Pro',
  'PT Sans', 'Nunito', 'Ubuntu', 'Quicksand', 'Rubik', 'Work Sans'
];

export default function BrandKitPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKitData>({
    identity: { brandName: '', description: '', guidelines: '' },
    logos: [],
    colors: [],
    fonts: [
      { id: '1', name: 'Título', type: 'title', fontFamily: 'Inter' },
      { id: '2', name: 'Subtítulo', type: 'subtitle', fontFamily: 'Inter' },
      { id: '3', name: 'Cuerpo', type: 'body', fontFamily: 'Inter' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadBrandKit(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsub();
  }, []);

  // Cargar Brand Kit desde Firestore
  async function loadBrandKit(uid: string) {
    try {
      setIsLoading(true);
      const docRef = doc(db, 'users', uid, 'brandKit', 'data');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as BrandKitData;
        setBrandKit(data);
        console.log('✅ Brand Kit cargado');
      } else {
        console.log('ℹ️ No hay Brand Kit guardado aún');
      }
    } catch (err: any) {
      console.error('❌ Error cargando Brand Kit:', err);
      setError('Error al cargar tu Brand Kit');
    } finally {
      setIsLoading(false);
    }
  }

  // Guardar Brand Kit en Firestore
  async function saveBrandKit() {
    if (!userId) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const updatedKit = {
        ...brandKit,
        updatedAt: new Date().toISOString()
      };
      
      const docRef = doc(db, 'users', userId, 'brandKit', 'data');
      await setDoc(docRef, updatedKit);
      
      setBrandKit(updatedKit);
      setSuccess('✅ Brand Kit guardado correctamente');
      setTimeout(() => setSuccess(null), 3000);
      
      console.log('✅ Brand Kit guardado en Firestore');
    } catch (err: any) {
      console.error('❌ Error guardando Brand Kit:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  // Subir logo
  async function handleLogoUpload(file: File) {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Validar archivo
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        setIsLoading(false);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no debe superar los 5MB');
        setIsLoading(false);
        return;
      }

      // Subir a Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const storagePath = `brand-kit/${userId}/logos/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Añadir a la lista
      const newLogo: BrandLogo = {
        id: timestamp.toString(),
        name: file.name,
        url,
        path: storagePath,
        type: file.type
      };
      
      setBrandKit(prev => ({
        ...prev,
        logos: [...prev.logos, newLogo]
      }));
      
      console.log('✅ Logo subido correctamente');
      setSuccess('✅ Logo añadido');
      setTimeout(() => setSuccess(null), 2000);
      
    } catch (err: any) {
      console.error('❌ Error subiendo logo:', err);
      setError('Error al subir el logo');
    } finally {
      setIsLoading(false);
    }
  }

  // Eliminar logo
  async function deleteLogo(logo: BrandLogo) {
    if (!confirm('¿Eliminar este logo?')) return;
    
    try {
      setIsLoading(true);
      
      // Eliminar de Storage
      const storageRef = ref(storage, logo.path);
      await deleteObject(storageRef);
      
      // Eliminar de la lista
      setBrandKit(prev => ({
        ...prev,
        logos: prev.logos.filter(l => l.id !== logo.id)
      }));
      
      console.log('✅ Logo eliminado');
      setSuccess('✅ Logo eliminado');
      setTimeout(() => setSuccess(null), 2000);
      
    } catch (err: any) {
      console.error('❌ Error eliminando logo:', err);
      setError('Error al eliminar el logo');
    } finally {
      setIsLoading(false);
    }
  }

  // Estados para modal de añadir/editar color
  const [showColorModal, setShowColorModal] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [newColorHex, setNewColorHex] = useState('#00d7fa');
  const [newColorName, setNewColorName] = useState('');

  // Añadir o editar color con nombre personalizado
  function addOrEditColor() {
    if (brandKit.colors.length >= 10 && !editingColorId) {
      setError('Máximo 10 colores');
      return;
    }
    
    if (!newColorName.trim()) {
      setError('Escribe un nombre para el color');
      return;
    }

    if (editingColorId) {
      // Editar color existente
      setBrandKit(prev => ({
        ...prev,
        colors: prev.colors.map(c => 
          c.id === editingColorId 
            ? { ...c, hex: newColorHex.toUpperCase(), name: newColorName.trim() }
            : c
        )
      }));
      
      setSuccess('✅ Color actualizado');
    } else {
      // Añadir nuevo color
      const newColor: BrandColor = {
        id: Date.now().toString(),
        hex: newColorHex.toUpperCase(),
        name: newColorName.trim()
      };
      
      setBrandKit(prev => ({
        ...prev,
        colors: [...prev.colors, newColor]
      }));
      
      setSuccess('✅ Color añadido');
    }
    
    // Reset modal
    setEditingColorId(null);
    setNewColorName('');
    setNewColorHex('#00d7fa');
    setShowColorModal(false);
    setTimeout(() => setSuccess(null), 2000);
  }

  // Abrir modal para editar
  function openEditColorModal(color: BrandColor) {
    setEditingColorId(color.id);
    setNewColorHex(color.hex);
    setNewColorName(color.name);
    setShowColorModal(true);
  }

  // Eliminar color
  function deleteColor(colorId: string) {
    if (!confirm('¿Eliminar este color?')) return;
    
    setBrandKit(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c.id !== colorId)
    }));
    
    setSuccess('✅ Color eliminado');
    setTimeout(() => setSuccess(null), 2000);
  }

  // Editar nombre del color
  function updateColorName(colorId: string, newName: string) {
    setBrandKit(prev => ({
      ...prev,
      colors: prev.colors.map(c => 
        c.id === colorId ? { ...c, name: newName } : c
      )
    }));
  }

  // Actualizar fuente
  function updateFont(fontId: string, fontFamily: string) {
    setBrandKit(prev => ({
      ...prev,
      fonts: prev.fonts.map(f => 
        f.id === fontId ? { ...f, fontFamily } : f
      )
    }));
  }

  // Copiar color al portapapeles
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess(`✅ Copiado: ${text}`);
    setTimeout(() => setSuccess(null), 2000);
  }

  // Eliminar Brand Kit completo
  async function deleteBrandKit() {
    if (!userId) return;
    if (!confirm('⚠️ ¿Eliminar todo el Brand Kit? Esta acción no se puede deshacer.')) return;
    
    try {
      setIsLoading(true);
      
      // Eliminar todos los logos de Storage
      for (const logo of brandKit.logos) {
        try {
          const storageRef = ref(storage, logo.path);
          await deleteObject(storageRef);
        } catch (err) {
          console.warn('Error eliminando logo:', err);
        }
      }
      
      // Eliminar documento de Firestore
      const docRef = doc(db, 'users', userId, 'brandKit', 'data');
      await deleteDoc(docRef);
      
      // Reset estado
      setBrandKit({
        identity: { brandName: '', description: '', guidelines: '' },
        logos: [],
        colors: [],
        fonts: [
          { id: '1', name: 'Título', type: 'title', fontFamily: 'Inter' },
          { id: '2', name: 'Subtítulo', type: 'subtitle', fontFamily: 'Inter' },
          { id: '3', name: 'Cuerpo', type: 'body', fontFamily: 'Inter' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setSuccess('✅ Brand Kit eliminado completamente');
      
    } catch (err: any) {
      console.error('❌ Error eliminando Brand Kit:', err);
      setError('Error al eliminar el Brand Kit');
    } finally {
      setIsLoading(false);
    }
  }

  // Descargar Brand Kit (simple versión - solo info en JSON)
  function downloadBrandKit() {
    const dataStr = JSON.stringify(brandKit, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brand-kit-${brandKit.identity.brandName || 'mi-marca'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    setSuccess('✅ Brand Kit descargado');
    setTimeout(() => setSuccess(null), 2000);
  }

  if (isLoading && brandKit.logos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-gray-600">Cargando tu Brand Kit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Kit de marca</h1>
          <p className="text-gray-600 mt-1">
            Almacena tu marca en un solo lugar: colores, logos, fuentes
          </p>
        </div>
        <button 
          onClick={saveBrandKit}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? '⏳ Guardando...' : '💾 Guardar Kit'}
        </button>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Banner motivacional */}
      <div className="bg-gradient-to-r from-purple-600 via-magenta-600 to-pink-600 text-white rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-2">Ve cómo tu marca cobra vida</h2>
        <p className="text-white/90">
          Crea una apariencia y sensación de marca con tu propio kit de marca.
        </p>
      </div>

      {/* Identidad */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Identidad</h3>
        <p className="text-sm text-gray-600 mb-6">
          Añade el nombre y la descripción de tu marca en un solo lugar
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nombre de la marca
            </label>
            <input
              type="text"
              value={brandKit.identity.brandName}
              onChange={(e) => setBrandKit(prev => ({
                ...prev,
                identity: { ...prev.identity, brandName: e.target.value }
              }))}
              placeholder="Ej: Mi Empresa SL"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Descripción de la marca
            </label>
            <textarea
              value={brandKit.identity.description}
              onChange={(e) => setBrandKit(prev => ({
                ...prev,
                identity: { ...prev.identity, description: e.target.value }
              }))}
              placeholder="Ej: Somos una empresa dedicada a..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Guidelines / Contacto (opcional)
            </label>
            <input
              type="text"
              value={brandKit.identity.guidelines}
              onChange={(e) => setBrandKit(prev => ({
                ...prev,
                identity: { ...prev.identity, guidelines: e.target.value }
              }))}
              placeholder="Ej: Persona de contacto, email, teléfono..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logotipo */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Logotipo</h3>
        <p className="text-sm text-gray-600 mb-6">Sube tu logotipo y sus variantes</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brandKit.logos.map((logo) => (
            <div 
              key={logo.id}
              className="relative aspect-square bg-gray-50 rounded-xl border-2 border-gray-200 p-4 group hover:border-cyan-500 transition-all"
            >
              <img 
                src={logo.url} 
                alt={logo.name}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                <button
                  onClick={() => deleteLogo(logo)}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  title="Eliminar"
                >
                  🗑️
                </button>
                <a
                  href={logo.url}
                  download={logo.name}
                  className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  title="Descargar"
                >
                  ⬇️
                </a>
              </div>
            </div>
          ))}

          {/* Botón añadir logo */}
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={isLoading}
            className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-cyan-500 hover:bg-cyan-50 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium text-gray-600">Añadir logo</span>
          </button>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Colores */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Colores</h3>
            <p className="text-sm text-gray-600 mt-1">
              Guarda los colores de tu marca (máximo 10)
            </p>
          </div>
          <button
            onClick={() => setShowColorModal(true)}
            disabled={brandKit.colors.length >= 10}
            className="btn btn-primary"
          >
            + Añadir color
          </button>
        </div>

        {brandKit.colors.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">Aún no has añadido colores</p>
            <button
              onClick={() => setShowColorModal(true)}
              className="btn btn-primary"
            >
              Añadir tu primer color
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {brandKit.colors.map((color, index) => (
              <div 
                key={color.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-cyan-500 transition-all group"
              >
                {/* Color preview */}
                <button
                  onClick={() => copyToClipboard(color.hex)}
                  className="w-20 h-20 rounded-xl border-2 border-gray-300 hover:scale-105 transition-transform flex-shrink-0 cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                  title={`Copiar ${color.hex}`}
                />
                
                {/* Info del color */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#6b7280', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Color {index + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => updateColorName(color.id, e.target.value)}
                    placeholder="Nombre del color (ej: Principal, Secundario)"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      width: '100%',
                      marginBottom: '12px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Círculo de color pequeño */}
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%',
                        border: '3px solid #9ca3af',
                        backgroundColor: color.hex,
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      title={color.hex}
                    />
                    <code style={{ 
                      fontSize: '14px', 
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid #d1d5db'
                    }}>
                      {color.hex}
                    </code>
                    <button
                      onClick={() => copyToClipboard(color.hex)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        backgroundColor: '#1f2937',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111827'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Botones de acción */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px'
                }}>
                  <button
                    onClick={() => openEditColorModal(color)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      backgroundColor: '#06b6d4',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06b6d4'}
                    title="Editar color"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteColor(color.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      backgroundColor: '#dc2626',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    title="Eliminar color"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para añadir/editar color */}
      {showColorModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowColorModal(false);
              setEditingColorId(null);
              setNewColorName('');
              setNewColorHex('#00d7fa');
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {editingColorId ? 'Editar color' : 'Añadir nuevo color'}
              </h3>

              <div className="space-y-6">
                {/* Preview del color */}
                <div 
                  className="w-full h-32 rounded-xl border-4 border-gray-200"
                  style={{ backgroundColor: newColorHex }}
                />

                {/* Selector de color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Color HEX
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newColorHex}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          setNewColorHex(value.toUpperCase());
                        }
                      }}
                      placeholder="#00D7FA"
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Nombre del color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nombre del color *
                  </label>
                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Ej: Principal, Secundario, Acento..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {newColorName.length}/30 caracteres
                  </p>
                </div>

                {/* Sugerencias */}
                {!editingColorId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-900 mb-2">
                      Sugerencias de nombres:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Principal', 'Secundario', 'Acento', 'Texto', 'Fondo', 'Éxito', 'Error', 'Advertencia'].map(name => (
                        <button
                          key={name}
                          onClick={() => setNewColorName(name)}
                          className="px-3 py-1 bg-white border border-blue-300 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-all"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowColorModal(false);
                    setEditingColorId(null);
                    setNewColorName('');
                    setNewColorHex('#00d7fa');
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={addOrEditColor}
                  disabled={!newColorName.trim()}
                  className="btn btn-primary flex-1"
                >
                  {editingColorId ? 'Guardar cambios' : 'Añadir color'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fuentes */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Fuentes</h3>
        <p className="text-sm text-gray-600 mb-6">
          Selecciona hasta 3 fuentes para tu marca. Cuanto más simples, mejor
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {brandKit.fonts.map((font) => (
            <div key={font.id} className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">
                {font.name}
              </label>
              <select
                value={font.fontFamily}
                onChange={(e) => updateFont(font.id, e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 outline-none"
              >
                {GOOGLE_FONTS.map((fontName) => (
                  <option key={fontName} value={fontName}>
                    {fontName}
                  </option>
                ))}
              </select>
              <div 
                className="h-20 bg-gray-50 rounded-xl border-2 border-gray-200 flex items-center justify-center px-4"
                style={{ fontFamily: font.fontFamily }}
              >
                <p className="text-center text-gray-700 font-medium">
                  {font.type === 'title' && 'Título de ejemplo'}
                  {font.type === 'subtitle' && 'Subtítulo de ejemplo'}
                  {font.type === 'body' && 'Texto de cuerpo'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          ✨ Aquí tienes un título potente
        </h3>
        <p className="text-gray-600 mb-6">
          Y un subtitulo igualmente de impacto donde puedas subir archivos que complementen tu marca y requieras a la hora de encargar tus servicios de diseño para negocios o algo así
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={downloadBrandKit}
            className="btn btn-primary btn-lg"
          >
            📥 Descargar el kit de marca
          </button>

          <button
            onClick={deleteBrandKit}
            disabled={isLoading}
            className="btn btn-outline btn-lg text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
          >
            🗑️ Eliminar este Kit de marca
          </button>
        </div>
      </div>
    </div>
  );
}