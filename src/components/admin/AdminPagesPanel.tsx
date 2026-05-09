// src/components/admin/AdminPagesPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import {
  getAllPages,
  createPage,
  updatePage,
  deletePage,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getAllGalleryItems,
  DEFAULT_PAGES,
  type Page,
  type GalleryItem,
} from '../../lib/pages';
import { Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

type EditorMode = 'edit' | 'preview';

interface MarkdownStats {
  hasH2: boolean;
  hasParagraphs: boolean;
  hasLinks: boolean;
  wordCount: number;
}

function analyzeMarkdown(content: string): MarkdownStats {
  return {
    hasH2: /^##\s/m.test(content),
    hasParagraphs: /\n\n/.test(content),
    hasLinks: /\[[^\]]+\]\([^)]+\)/.test(content),
    wordCount: content.trim().split(/\s+/).filter(Boolean).length,
  };
}

function insertMarkdown(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after: string,
  placeholder: string,
  setContent: (v: string) => void
) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const newText = value.slice(0, start) + before + selected + after + value.slice(end);
  setContent(newText);
  setTimeout(() => {
    textarea.focus();
    const cursor = start + before.length;
    textarea.setSelectionRange(cursor, cursor + selected.length);
  }, 0);
}

/**
 * Auto-formatea markdown que perdió newlines en copy/paste.
 * Detecta `##`, `###`, `- `, `1. ` inline y agrega `\n\n` antes/después.
 * Idempotente: si ya está bien formateado, no rompe nada.
 */
function autoFixMarkdown(content: string): { fixed: string; changes: number } {
  let result = content;
  let changes = 0;

  // Primero normalizar: trim espacios al inicio/fin
  result = result.trim();

  // Agregar \n\n antes de ## (si no está al inicio y no tiene ya \n\n antes)
  result = result.replace(/([^\n])\s*(#{2,3}\s)/g, (_match, prev, hash) => {
    changes++;
    return `${prev}\n\n${hash}`;
  });

  // Agregar \n\n después del título de heading (## Texto del título Otro_contenido)
  // Detecta línea con ## seguida en la misma línea por más texto que NO es continuación del título
  result = result.replace(/^(#{2,3} [^\n]{1,150}?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/gm, (match, heading, nextStart) => {
    // Solo si el siguiente texto parece ser un nuevo párrafo (empieza mayúscula después de espacio largo)
    if (heading.length > 30 && match.length > heading.length + 20) {
      changes++;
      return `${heading}\n\n${nextStart}`;
    }
    return match;
  });

  // Agregar \n\n antes de bullets pegados a texto (texto. - bullet)
  result = result.replace(/([.:!?])\s+(- \*\*)/g, (_match, punct, bullet) => {
    changes++;
    return `${punct}\n\n${bullet}`;
  });

  // Agregar \n\n antes de listas numeradas pegadas
  result = result.replace(/([.:!?])\s+(\d+\.\s\*\*)/g, (_match, punct, bullet) => {
    changes++;
    return `${punct}\n\n${bullet}`;
  });

  // Separar bullets pegados entre sí: ` - ítem1 - ítem2` → `- ítem1\n- ítem2`
  result = result.replace(/(\S)\s+(- \*\*[^*]+\*\*)/g, (match, prev, bullet) => {
    if (prev === '\n' || prev === '*') return match;
    changes++;
    return `${prev}\n${bullet}`;
  });

  // Colapsar 3+ newlines a 2
  result = result.replace(/\n{3,}/g, '\n\n');

  return { fixed: result, changes };
}

type TabType = 'pages' | 'blog' | 'gallery';

/** Input type for creating/updating pages - mirrors Page without id and timestamps */
interface PageInput {
  title: string;
  slug: string;
  content: string;
  metaDescription?: string;
  type: 'page' | 'blog' | 'gallery';
  status: 'draft' | 'published';
  featuredImage?: string;
  author?: string;
  // Blog-specific fields
  excerpt?: string;
  tags?: string[];
  category?: string;
}

export default function AdminPagesPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('pages');
  const [pages, setPages] = useState<Page[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);

  // Page Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    metaDescription: '',
    type: 'page' as 'page' | 'blog' | 'gallery',
    status: 'draft' as 'draft' | 'published',
    featuredImage: '',
    author: '',
    excerpt: '',
    tags: '',
    category: '',
  });

  // Gallery Form State
  const [galleryFormData, setGalleryFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
    tags: '',
  });

  const [uploading, setUploading] = useState(false);

  // Editor markdown state
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Accessible confirmation dialog
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const setContentValue = (v: string) => setFormData((prev) => ({ ...prev, content: v }));
  const mdStats = analyzeMarkdown(formData.content);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'gallery') {
        const items = await getAllGalleryItems();
        setGalleryItems(items);
      } else {
        const allPages = await getAllPages();
        const filtered = allPages.filter((p) => {
          if (activeTab === 'pages') return p.type === 'page';
          if (activeTab === 'blog') return p.type === 'blog';
          return true;
        });
        setPages(filtered);
      }
    } catch (error) {
      logger.error('[AdminPages] Error loading data', error);
      notify.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaultPages() {
    const confirmed = await confirm({
      title: '¿Crear páginas predeterminadas?',
      message: 'Esto creará: Sobre Nosotros, FAQ, Contacto y Privacidad.',
      type: 'info',
      confirmText: 'Crear',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      for (const pageData of DEFAULT_PAGES) {
        await createPage({
          ...pageData,
          publishedAt: Timestamp.now(),
        } as any);
      }

      notify.success('Páginas predeterminadas creadas exitosamente');
      loadData();
    } catch (error) {
      logger.error('[AdminPages] Error creating default pages', error);
      notify.error('Error al crear las páginas predeterminadas');
    }
  }

  function handleEdit(page: Page) {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      metaDescription: page.metaDescription || '',
      type: page.type,
      status: page.status,
      featuredImage: page.featuredImage || '',
      author: page.author || '',
      excerpt: (page as any).excerpt || '',
      tags: (page as any).tags?.join(', ') || '',
      category: (page as any).category || '',
    });
    setShowForm(true);
  }

  function handleEditGalleryItem(item: GalleryItem) {
    setEditingGalleryItem(item);
    setGalleryFormData({
      title: item.title,
      description: item.description || '',
      imageUrl: item.imageUrl,
      category: item.category || '',
      tags: item.tags?.join(', ') || '',
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: '¿Eliminar elemento?',
      message: '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.',
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      if (activeTab === 'gallery') {
        await deleteGalleryItem(id);
      } else {
        await deletePage(id);
      }
      notify.success('Elemento eliminado');
      loadData();
    } catch (error) {
      logger.error('[AdminPages] Error deleting', error);
      notify.error('Error al eliminar');
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `pages/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      if (activeTab === 'gallery') {
        setGalleryFormData((prev) => ({ ...prev, imageUrl: url }));
      } else {
        setFormData((prev) => ({ ...prev, featuredImage: url }));
      }

      notify.success('Imagen subida correctamente');
    } catch (error) {
      logger.error('[AdminPages] Error uploading image', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (activeTab === 'gallery') {
        // Gallery item
        const itemData = {
          title: galleryFormData.title,
          description: galleryFormData.description,
          imageUrl: galleryFormData.imageUrl,
          category: galleryFormData.category,
          tags: galleryFormData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        };

        if (editingGalleryItem) {
          await updateGalleryItem(editingGalleryItem.id, itemData);
        } else {
          await createGalleryItem(itemData as any);
        }
      } else {
        // Page or blog
        const pageData: PageInput = {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          metaDescription: formData.metaDescription,
          type: formData.type,
          status: formData.status,
          featuredImage: formData.featuredImage || undefined,
          author: formData.author || undefined,
          // Blog-specific fields - conditionally added
          ...(formData.type === 'blog' && {
            excerpt: formData.excerpt,
            tags: formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            category: formData.category,
          }),
        };

        if (editingPage) {
          await updatePage(editingPage.id, pageData);
        } else {
          await createPage(pageData);
        }
      }

      notify.success('Guardado correctamente');
      setShowForm(false);
      setEditingPage(null);
      setEditingGalleryItem(null);
      resetForm();
      loadData();
    } catch (error) {
      logger.error('[AdminPages] Error saving', error);
      notify.error('Error al guardar');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      slug: '',
      content: '',
      metaDescription: '',
      type: activeTab === 'blog' ? 'blog' : 'page',
      status: 'draft',
      featuredImage: '',
      author: '',
      excerpt: '',
      tags: '',
      category: '',
    });
    setGalleryFormData({
      title: '',
      description: '',
      imageUrl: '',
      category: '',
      tags: '',
    });
  }

  function handleCancel() {
    setShowForm(false);
    setEditingPage(null);
    setEditingGalleryItem(null);
    resetForm();
  }

  const displayedPages = pages;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Contenido</h2>
        <p className="text-gray-600">Administra páginas, blog y galería</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('pages');
            setShowForm(false);
          }}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'pages'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📄 Páginas
        </button>
        <button
          onClick={() => {
            setActiveTab('blog');
            setShowForm(false);
          }}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'blog'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Blog
        </button>
        <button
          onClick={() => {
            setActiveTab('gallery');
            setShowForm(false);
          }}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'gallery'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🖼️ Galería
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setEditingPage(null);
            setEditingGalleryItem(null);
            resetForm();
            setFormData((prev) => ({ ...prev, type: activeTab === 'blog' ? 'blog' : 'page' }));
            setShowForm(true);
          }}
          className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition-colors"
        >
          +{' '}
          {activeTab === 'gallery'
            ? 'Nueva Imagen'
            : activeTab === 'blog'
              ? 'Nuevo Post'
              : 'Nueva Página'}
        </button>

        {activeTab === 'pages' && pages.length === 0 && (
          <button
            onClick={initializeDefaultPages}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
          >
            ⚡ Crear Páginas Predeterminadas
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : showForm ? (
        activeTab === 'gallery' ? (
          /* Gallery Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-6">
              {editingGalleryItem ? 'Editar Imagen' : 'Nueva Imagen'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={galleryFormData.title}
                  onChange={(e) =>
                    setGalleryFormData({ ...galleryFormData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={galleryFormData.description}
                  onChange={(e) =>
                    setGalleryFormData({ ...galleryFormData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Imagen *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  disabled={uploading}
                />
                {galleryFormData.imageUrl && (
                  <img
                    src={galleryFormData.imageUrl}
                    alt="Preview"
                    className="mt-4 w-64 h-64 object-cover rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                <input
                  type="text"
                  value={galleryFormData.category}
                  onChange={(e) =>
                    setGalleryFormData({ ...galleryFormData, category: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  placeholder="Impresión 3D, Textil, Sublimación..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (separados por comas)
                </label>
                <input
                  type="text"
                  value={galleryFormData.tags}
                  onChange={(e) => setGalleryFormData({ ...galleryFormData, tags: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  placeholder="resina, funko, personalizado"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700"
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          /* Page/Blog Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-6">
              {editingPage ? 'Editar' : 'Crear'} {activeTab === 'blog' ? 'Post' : 'Página'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w-]/g, ''),
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contenido (Markdown) *
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowCheatsheet((v) => !v)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                    >
                      {showCheatsheet ? '✕ Cerrar' : '? Sintaxis'}
                    </button>
                  </div>
                </div>

                {showCheatsheet && (
                  <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                    <h4 className="font-bold mb-2 text-blue-900">Cheatsheet Markdown</h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div><code className="bg-white px-2 py-1 rounded">## Título sección</code> → Heading H2</div>
                      <div><code className="bg-white px-2 py-1 rounded">### Subtítulo</code> → Heading H3</div>
                      <div><code className="bg-white px-2 py-1 rounded">**texto**</code> → <strong>negrita</strong></div>
                      <div><code className="bg-white px-2 py-1 rounded">*texto*</code> → <em>itálica</em></div>
                      <div><code className="bg-white px-2 py-1 rounded">[texto](/ruta)</code> → enlace</div>
                      <div><code className="bg-white px-2 py-1 rounded">- ítem</code> → lista</div>
                      <div><code className="bg-white px-2 py-1 rounded">1. ítem</code> → lista numerada</div>
                      <div><code className="bg-white px-2 py-1 rounded">&gt; cita</code> → blockquote</div>
                    </div>
                    <p className="mt-3 text-blue-800 text-xs">
                      <strong>Importante:</strong> separa cada bloque (heading, párrafo, lista) con una <strong>línea en blanco</strong>. Sin línea en blanco antes de <code>##</code>, no se renderiza como heading.
                    </p>
                  </div>
                )}

                {/* Tabs Editor / Preview */}
                <div className="flex border-b border-gray-200 mb-2">
                  <button
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                      editorMode === 'edit'
                        ? 'border-cyan-500 text-cyan-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✎ Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                      editorMode === 'preview'
                        ? 'border-cyan-500 text-cyan-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    👁 Vista previa
                  </button>
                </div>

                {editorMode === 'edit' ? (
                  <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-300 border-b-0 rounded-t-xl">
                      <button
                        type="button"
                        title="Heading H2"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n## ', '\n\n', 'Título de sección', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded font-bold text-sm border border-gray-200"
                      >H2</button>
                      <button
                        type="button"
                        title="Heading H3"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n### ', '\n\n', 'Subtítulo', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded font-bold text-sm border border-gray-200"
                      >H3</button>
                      <button
                        type="button"
                        title="Negrita"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '**', '**', 'texto en negrita', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded font-bold text-sm border border-gray-200"
                      >B</button>
                      <button
                        type="button"
                        title="Itálica"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '*', '*', 'texto en itálica', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded italic text-sm border border-gray-200"
                      >I</button>
                      <button
                        type="button"
                        title="Enlace"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '[', '](/ruta)', 'texto del enlace', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200 text-cyan-600 underline"
                      >Link</button>
                      <button
                        type="button"
                        title="Lista"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n- ', '\n- ítem 2\n- ítem 3\n\n', 'ítem 1', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                      >• Lista</button>
                      <button
                        type="button"
                        title="Lista numerada"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n1. ', '\n2. paso 2\n3. paso 3\n\n', 'paso 1', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                      >1. Lista</button>
                      <button
                        type="button"
                        title="Cita"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n> ', '\n\n', 'cita destacada', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                      >❝ Cita</button>
                      <button
                        type="button"
                        title="Línea en blanco entre párrafos"
                        onClick={() => insertMarkdown(contentTextareaRef.current, '\n\n', '', '', setContentValue)}
                        className="px-3 py-1 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                      >¶ Párrafo</button>

                      <div className="ml-auto">
                        <button
                          type="button"
                          title="Auto-arreglar formato markdown (agrega saltos de línea perdidos en copy/paste)"
                          onClick={() => {
                            const { fixed, changes } = autoFixMarkdown(formData.content);
                            setContentValue(fixed);
                            if (changes > 0) {
                              notify.success(`✓ Markdown arreglado: ${changes} cambios aplicados`);
                            } else {
                              notify.info('Markdown ya está bien formateado');
                            }
                          }}
                          className="px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded text-sm border border-amber-300 font-semibold text-amber-900"
                        >🔧 Auto-arreglar</button>
                      </div>
                    </div>
                    <textarea
                      ref={contentTextareaRef}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 border-t-0 rounded-b-xl font-mono text-sm leading-relaxed"
                      rows={20}
                      required
                      placeholder={`## Introducción\n\nPrimer párrafo del post. Puedes usar **negrita** o [enlaces](/productos).\n\n## Sección principal\n\n- Punto 1\n- Punto 2\n\n### Subsección\n\nMás contenido aquí...`}
                    />
                  </>
                ) : (
                  <div className="border border-gray-300 rounded-xl p-6 bg-white min-h-[500px] max-h-[700px] overflow-y-auto">
                    {formData.content.trim() ? (
                      <div
                        className="prose prose-lg max-w-none
                          prose-headings:font-bold prose-headings:text-gray-900
                          prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4
                          prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
                          prose-p:text-gray-700 prose-p:leading-relaxed
                          prose-a:text-cyan-600 hover:prose-a:underline
                          prose-strong:text-gray-900
                          prose-ul:list-disc prose-ol:list-decimal
                          prose-li:my-1
                          prose-blockquote:border-l-4 prose-blockquote:border-cyan-500"
                        dangerouslySetInnerHTML={{ __html: marked(formData.content) as string }}
                      />
                    ) : (
                      <p className="text-gray-400 text-center py-12">Escribe contenido en el editor para ver la vista previa</p>
                    )}
                  </div>
                )}

                {/* Stats / validación */}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span className="text-gray-600">
                    📊 {mdStats.wordCount} palabras
                  </span>
                  <span className={mdStats.hasH2 ? 'text-green-600' : 'text-orange-600'}>
                    {mdStats.hasH2 ? '✓' : '⚠'} Headings H2
                  </span>
                  <span className={mdStats.hasParagraphs ? 'text-green-600' : 'text-orange-600'}>
                    {mdStats.hasParagraphs ? '✓' : '⚠'} Párrafos separados
                  </span>
                  <span className={mdStats.hasLinks ? 'text-green-600' : 'text-gray-500'}>
                    {mdStats.hasLinks ? '✓' : '○'} Enlaces internos
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Meta Descripción
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  rows={2}
                  placeholder="Descripción para SEO (160 caracteres)"
                />
              </div>

              {activeTab === 'blog' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Extracto
                    </label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                      rows={3}
                      placeholder="Resumen breve del post"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Autor</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                      placeholder="Nombre del autor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                      placeholder="Tutoriales, Novedades, Consejos..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tags (separados por comas)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                      placeholder="impresion-3d, tutoriales, resina"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Imagen Destacada
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  disabled={uploading}
                />
                {formData.featuredImage && (
                  <img
                    src={formData.featuredImage}
                    alt="Preview"
                    className="mt-4 w-full h-48 object-cover rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estado *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700"
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        )
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {activeTab === 'gallery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {galleryItems.map((item) => (
                <div key={item.id} className="group relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="mt-2">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    {item.category && (
                      <span className="text-xs text-gray-600">{item.category}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditGalleryItem(item)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Slug</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{page.title}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">/{page.slug}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          page.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {page.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(page.createdAt.seconds * 1000).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(page)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                        <a
                          href={page.type === 'blog' ? `/blog/${page.slug}` : `/${page.slug}`}
                          target="_blank"
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                          rel="noreferrer"
                        >
                          Ver
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {((activeTab === 'gallery' && galleryItems.length === 0) ||
            (activeTab !== 'gallery' && displayedPages.length === 0)) && (
            <div className="text-center py-12 text-gray-600">
              No hay{' '}
              {activeTab === 'gallery' ? 'imágenes' : activeTab === 'blog' ? 'posts' : 'páginas'}{' '}
              creadas
            </div>
          )}
        </div>
      )}

      {/* Accessible confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
