import {
  Check,
  Eye,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useStudio } from '../context/StudioContext';
import { STUDIO_BLOG_COVERS } from '../data/seedCatalog';
import {
  BLOG_CATEGORIES,
  BlogArticleBody,
  BlogCoverImage,
  formatBlogDate,
} from './BlogsPage';
import type { BlogCategory, BlogPost } from '../types/studio';

interface AdminBlogsPanelProps {
  onOpenBlogs: () => void;
  flashNotice: (msg: string) => void;
  setErrorNotice: (msg: string | null) => void;
}

const MAX_DATA_URL_LENGTH = 260_000;

async function compressBlogImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        let maxDim = 1200;
        let quality = 0.82;

        const renderAttempt = (): string => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas image processor unavailable.');
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', quality);
        };

        try {
          let dataUrl = renderAttempt();
          while (dataUrl.length > MAX_DATA_URL_LENGTH && (quality > 0.42 || maxDim > 560)) {
            if (quality > 0.45) {
              quality = Math.max(0.4, quality - 0.14);
            } else {
              maxDim = Math.round(maxDim * 0.78);
            }
            dataUrl = renderAttempt();
          }
          if (dataUrl.length > 340_000) {
            reject(new Error('Cover photo is still too large after compression. Please choose a smaller image.'));
            return;
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to process cover image.'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AdminBlogsPanel({
  onOpenBlogs,
  flashNotice,
  setErrorNotice,
}: AdminBlogsPanelProps) {
  const {
    blogPosts,
    adminCreateBlogPost,
    adminUpdateBlogPost,
    adminDeleteBlogPost,
    adminSeedStarterBlogs,
  } = useStudio();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'write' | 'preview'>('write');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Nail Care & Health');
  const [authorName, setAuthorName] = useState('Eshin');
  const [readTimeMin, setReadTimeMin] = useState('4');
  const [coverImageUrl, setCoverImageUrl] = useState(STUDIO_BLOG_COVERS[0].url);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);

  const [processingImg, setProcessingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingStarters, setSeedingStarters] = useState(false);

  const openCreateComposer = () => {
    setEditingPost(null);
    setComposerMode('write');
    setTitle('');
    setCategory('Nail Care & Health');
    setAuthorName('Eshin');
    setReadTimeMin('4');
    setCoverImageUrl(STUDIO_BLOG_COVERS[0].url);
    setExcerpt('');
    setContent('');
    setFeatured(false);
    setPublished(true);
    setFormError(null);
    setComposerOpen(true);
  };

  const openEditComposer = (post: BlogPost) => {
    setEditingPost(post);
    setComposerMode('write');
    setTitle(post.title);
    setCategory(post.category);
    setAuthorName(post.authorName);
    setReadTimeMin(String(post.readTimeMin));
    setCoverImageUrl(post.coverImageUrl);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setFeatured(post.featured);
    setPublished(post.published);
    setFormError(null);
    setComposerOpen(true);
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImg(true);
    setFormError(null);
    try {
      const compressed = await compressBlogImage(file);
      setCoverImageUrl(compressed);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to process selected photo.');
    } finally {
      setProcessingImg(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 2) {
      setFormError('Please enter a blog title (at least 2 characters).');
      return;
    }
    if (excerpt.trim().length < 10) {
      setFormError('Please write a short summary / excerpt (at least 10 characters).');
      return;
    }
    if (content.trim().length < 20) {
      setFormError('Please write the article body (at least 20 characters).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImageUrl: coverImageUrl.trim(),
        authorName: authorName.trim() || 'Eshin',
        readTimeMin: Math.min(60, Math.max(1, Number(readTimeMin) || 3)),
        featured,
        published,
      };
      if (editingPost) {
        await adminUpdateBlogPost(editingPost.id, payload);
        flashNotice(`Updated blog post "${payload.title}".`);
      } else {
        await adminCreateBlogPost(payload);
        flashNotice(
          payload.published
            ? `Published "${payload.title}" to Blogs.`
            : `Saved "${payload.title}" as a draft.`,
        );
      }
      setComposerOpen(false);
      setEditingPost(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save blog article.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    setTogglingId(post.id);
    setErrorNotice(null);
    try {
      await adminUpdateBlogPost(post.id, {
        title: post.title,
        category: post.category,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        authorName: post.authorName,
        readTimeMin: post.readTimeMin,
        featured: post.featured,
        published: !post.published,
      });
      flashNotice(
        post.published
          ? `Moved "${post.title}" to drafts.`
          : `Published "${post.title}" to public Blogs.`,
      );
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Unable to update blog visibility.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSeedStarters = async () => {
    setSeedingStarters(true);
    setErrorNotice(null);
    try {
      await adminSeedStarterBlogs();
      flashNotice('Loaded Love Those Nails starter articles.');
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Unable to load starter articles.');
    } finally {
      setSeedingStarters(false);
    }
  };

  const publishedCount = blogPosts.filter((p) => p.published).length;
  const draftCount = blogPosts.length - publishedCount;

  return (
    <div className="neu-surface p-5 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
            Studio Blog Articles
          </h2>
          <p className="text-xs text-[#554C4B] mt-0.5">
            Write, edit, publish, or feature nail care guides and studio stories on the Blogs page.
            {' '}
            <span className="font-mono text-[#141212] tabular-nums">
              {publishedCount} published · {draftCount} drafts
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onOpenBlogs}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#8A5A5C]" />
            <span>View Public Blogs</span>
          </button>
          <button
            type="button"
            onClick={openCreateComposer}
            className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-ink text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Blog</span>
          </button>
        </div>
      </div>

      <div className="neu-divider" />

      {blogPosts.length === 0 ? (
        <div className="py-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto neu-inset rounded-2xl flex items-center justify-center text-[#8A5A5C]">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#141212]">No blog articles yet.</p>
            <p className="text-xs text-[#554C4B]">
              Write an original journal entry or restore the 3 studio starter articles.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={seedingStarters}
              onClick={handleSeedStarters}
              className="inline-flex items-center gap-2 px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedingStarters ? 'animate-spin' : ''}`} />
              <span>{seedingStarters ? 'Loading...' : 'Restore Starter Articles'}</span>
            </button>
            <button
              type="button"
              onClick={openCreateComposer}
              className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-rose text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write First Blog</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => {
            const busyToggle = togglingId === post.id;
            const busyDelete = deletingId === post.id;
            return (
              <div
                key={post.id}
                className={`neu-inset p-4 flex flex-col justify-between gap-4 ${
                  post.published ? '' : 'opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#EBE3E2]">
                    <BlogCoverImage src={post.coverImageUrl} alt={post.title} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold">
                      <span className={post.published ? 'text-[#16A34A]' : 'text-[#B45309]'}>
                        {post.published ? 'Published' : 'Draft'}
                        {post.featured ? ' · Featured' : ''}
                      </span>
                      <span className="text-[#554C4B] font-mono font-normal">
                        {post.readTimeMin}m
                      </span>
                    </div>

                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#8A5A5C]">
                      {post.category}
                    </p>

                    <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#141212] leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-[#554C4B] leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="neu-divider" />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => openEditComposer(post)}
                        className="inline-flex items-center gap-1 font-medium text-[#141212] underline underline-offset-4 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyToggle}
                        onClick={() => handleTogglePublish(post)}
                        className="px-2.5 py-1 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
                      >
                        {busyToggle ? 'Saving...' : post.published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>

                    {confirmDeleteId === post.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyDelete}
                          onClick={async () => {
                            setDeletingId(post.id);
                            setErrorNotice(null);
                            try {
                              await adminDeleteBlogPost(post.id);
                              setConfirmDeleteId(null);
                              flashNotice(`Deleted "${post.title}".`);
                            } catch (err) {
                              setErrorNotice(
                                err instanceof Error
                                  ? err.message
                                  : 'Unable to delete blog post.',
                              );
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 neu-btn-ink text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          <span>{busyDelete ? 'Removing...' : 'Confirm'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyDelete}
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 neu-btn text-[11px] text-[#554C4B] cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="inline-flex items-center gap-1 text-xs text-[#8E353B] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#554C4B]">
                    By {post.authorName} · {formatBlogDate(post.updatedAt ?? post.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Blog Composer & Live Preview Modal */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#141212]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingPost ? 'Edit Blog Post' : 'Write New Blog Post'}
        >
          <div className="w-full max-w-3xl neu-surface max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8A5A5C] font-medium">
                  Admin Blog Editor
                </p>
                <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212] mt-1">
                  {editingPost ? 'Edit Studio Article' : 'Write New Studio Article'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 neu-inset p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setComposerMode('write')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                      composerMode === 'write' ? 'neu-btn-ink' : 'text-[#554C4B]'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('preview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                      composerMode === 'preview' ? 'neu-btn-ink' : 'text-[#554C4B]'
                    }`}
                  >
                    Preview
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  aria-label="Close blog composer"
                  className="p-2.5 neu-btn text-[#141212] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {composerMode === 'preview' ? (
              <div className="space-y-6">
                <div className="neu-inset p-5 sm:p-7 space-y-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A5A5C]">
                    {category} · {readTimeMin || 3} min read · Preview
                  </p>
                  <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212] leading-tight">
                    {title || 'Untitled Studio Article'}
                  </h3>
                  <p className="font-['Playfair_Display'] italic text-base sm:text-lg text-[#554C4B]">
                    {excerpt || 'Your short summary deck will appear here...'}
                  </p>
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#EBE3E2]">
                    <BlogCoverImage src={coverImageUrl} alt={title || 'Cover preview'} />
                  </div>
                  <BlogArticleBody
                    content={content || 'Start writing your article body to preview how paragraphs, ## headings, and > quotes will look.'}
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setComposerMode('write')}
                    className="px-5 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                  >
                    Back to Editor
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Cover Image Picker & Upload */}
                <div className="space-y-3">
                  <span className="block text-xs font-medium text-[#141212]">
                    Cover Image
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    <div className="sm:col-span-5 neu-inset p-2 rounded-2xl">
                      <div className="aspect-[4/3] rounded-xl bg-[#EBE3E2] overflow-hidden flex items-center justify-center">
                        {coverImageUrl ? (
                          <BlogCoverImage src={coverImageUrl} alt="Article cover preview" />
                        ) : (
                          <div className="text-center p-4 space-y-1.5 text-[#554C4B]">
                            <ImagePlus className="w-6 h-6 mx-auto opacity-70" />
                            <p className="text-xs">Optional cover photo</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-3">
                      <label className="neu-btn px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-[#141212] cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>
                          {processingImg ? 'Optimizing image...' : 'Upload Photo from Device'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="sr-only"
                        />
                      </label>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-[#554C4B]">
                          Or choose a Studio Editorial Cover:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {STUDIO_BLOG_COVERS.map((preset) => (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => setCoverImageUrl(preset.url)}
                              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg cursor-pointer ${
                                coverImageUrl === preset.url
                                  ? 'neu-btn-rose text-[#141212]'
                                  : 'neu-btn text-[#554C4B]'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="block text-[11px] text-[#554C4B]">
                        Or paste image URL (https://)
                        <input
                          type="text"
                          value={coverImageUrl.startsWith('data:') ? '' : coverImageUrl}
                          onChange={(e) => setCoverImageUrl(e.target.value)}
                          placeholder="https://... or /assets/blog/..."
                          className="mt-1 w-full neu-input px-3 py-2 text-xs text-[#141212]"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Title & Metadata */}
                <label className="block text-xs font-medium text-[#141212]">
                  Article Title
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., How to Prepare Your Natural Nails Before BIAB"
                    className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212]"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="block text-xs font-medium text-[#141212]">
                    Category
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BlogCategory)}
                      className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212]"
                    >
                      {BLOG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-[#141212]">
                    Author Name
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212]"
                    />
                  </label>

                  <label className="block text-xs font-medium text-[#141212]">
                    Read Time (minutes)
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={readTimeMin}
                      onChange={(e) => setReadTimeMin(e.target.value)}
                      className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212]"
                    />
                  </label>
                </div>

                {/* Short Excerpt */}
                <label className="block text-xs font-medium text-[#141212]">
                  Short Summary / Standfirst ({excerpt.length}/320)
                  <textarea
                    required
                    rows={2}
                    minLength={10}
                    maxLength={320}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="A 1–2 sentence editorial summary displayed on the Blogs page..."
                    className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] resize-none"
                  />
                </label>

                {/* Full Article Body */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="blog-content-input" className="text-xs font-medium text-[#141212]">
                      Article Content ({content.length}/8000)
                    </label>
                    <span className="text-[11px] text-[#554C4B]">
                      Tip: Start a paragraph with <code className="font-mono">## Heading</code> or{' '}
                      <code className="font-mono">&gt; Quote</code>
                    </span>
                  </div>
                  <textarea
                    id="blog-content-input"
                    required
                    rows={9}
                    minLength={20}
                    maxLength={8000}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Write your studio notes here...\n\n## Section Title\nExplain care steps or share inspiration.\n\n> Highlight a signature studio quote.`}
                    className="w-full neu-input px-3.5 py-3 text-sm text-[#141212] leading-relaxed"
                  />
                </div>

                {/* Visibility & Feature Switches */}
                <div className="neu-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#141212] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="accent-[#141212] w-4 h-4"
                    />
                    <span>Publish live on public Blogs page (uncheck to save as Draft)</span>
                  </label>

                  <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#141212] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="accent-[#141212] w-4 h-4"
                    />
                    <span>Feature as Lead Story</span>
                  </label>
                </div>

                {formError && (
                  <div className="neu-inset p-3.5 text-xs text-[#8E353B]">{formError}</div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="px-5 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || processingImg}
                    className="px-6 py-2.5 neu-btn-ink text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-50"
                  >
                    {saving
                      ? 'Saving...'
                      : editingPost
                        ? 'Save Article Changes'
                        : published
                          ? 'Publish Blog Article'
                          : 'Save as Draft'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
