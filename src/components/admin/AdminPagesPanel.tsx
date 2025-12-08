// src/components/admin/AdminPagesPanel.tsx
import { useState, useEffect } from 'react';
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

  // Accessible confirmation dialog
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
          tags: galleryFormData.tags.split(',').map((t) => t.trim()).filter(Boolean),
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
            tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
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
          onClick={() => { setActiveTab('pages'); setShowForm(false); }}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'pages'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📄 Páginas
        </button>
        <button
          onClick={() => { setActiveTab('blog'); setShowForm(false); }}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'blog'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Blog
        </button>
        <button
          onClick={() => { setActiveTab('gallery'); setShowForm(false); }}
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
          + {activeTab === 'gallery' ? 'Nueva Imagen' : activeTab === 'blog' ? 'Nuevo Post' : 'Nueva Página'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={galleryFormData.title}
                  onChange={(e) => setGalleryFormData({ ...galleryFormData, title: e.target.value })}
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
                  onChange={(e) => setGalleryFormData({ ...galleryFormData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Imagen *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  disabled={uploading}
                />
                {galleryFormData.imageUrl && (
                  <img src={galleryFormData.imageUrl} alt="Preview" className="mt-4 w-64 h-64 object-cover rounded-xl" />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría
                </label>
                <input
                  type="text"
                  value={galleryFormData.category}
                  onChange={(e) => setGalleryFormData({ ...galleryFormData, category: e.target.value })}
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
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Slug (URL) *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contenido *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm"
                  rows={12}
                  required
                  placeholder="Usa Markdown: # Título, ## Subtítulo, **negrita**, - lista"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Descripción</label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Extracto</label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Imagen Destacada</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  disabled={uploading}
                />
                {formData.featuredImage && (
                  <img src={formData.featuredImage} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-xl" />
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Título</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Slug</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
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
                          href={`/${page.slug}`}
                          target="_blank"
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
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
              No hay {activeTab === 'gallery' ? 'imágenes' : activeTab === 'blog' ? 'posts' : 'páginas'} creadas
            </div>
          )}
        </div>
      )}

      {/* Accessible confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
