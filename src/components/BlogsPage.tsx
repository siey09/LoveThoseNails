import { ArrowLeft, ArrowRight, BookOpen, Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import type { BlogCategory, BlogPost } from '../types/studio';
import type { BookingModalInitialState } from './BookingModal';

interface BlogsPageProps {
  onOpenBooking: (preset?: BookingModalInitialState) => void;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  'Nail Care & Health',
  'Seasonal Trends',
  'Aftercare Guide',
  'Studio Stories',
  'Behind the Chair',
];

export function formatBlogDate(ts: unknown): string {
  if (!ts) return 'Studio Edition';
  try {
    const maybeObj = ts as { toDate?: () => Date; seconds?: number };
    const date =
      typeof maybeObj.toDate === 'function'
        ? maybeObj.toDate()
        : typeof maybeObj.seconds === 'number'
          ? new Date(maybeObj.seconds * 1000)
          : new Date(String(ts));
    if (Number.isNaN(date.getTime())) return 'Studio Edition';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Studio Edition';
  }
}

export function BlogCoverImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-[#EADAD9] via-[#E1C9C8] to-[#D2AAAB] flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
      >
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#554C4B] font-medium">
          Love Those Nails
        </span>
        <span className="font-['Playfair_Display'] italic text-lg sm:text-xl text-[#141212] mt-1">
          Studio Journal
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

export function BlogArticleBody({ content }: { content: string }) {
  const blocks = useMemo(() => {
    return content
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
  }, [content]);

  let renderedFirstParagraph = false;

  return (
    <div className="space-y-6 text-[#2B2524] text-[15px] sm:text-base leading-[1.82]">
      {blocks.map((block, idx) => {
        if (block.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="font-['Playfair_Display'] text-2xl sm:text-[26px] font-semibold text-[#141212] pt-3 tracking-tight leading-snug"
            >
              {block.replace(/^##\s+/, '')}
            </h2>
          );
        }

        if (block.startsWith('> ')) {
          const quoteText = block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <blockquote
              key={idx}
              className="my-7 py-5 border-y border-[#D8CAC8] text-center px-3 sm:px-6"
            >
              <p className="font-['Playfair_Display'] italic text-xl sm:text-2xl text-[#141212] leading-relaxed">
                &ldquo;{quoteText}&rdquo;
              </p>
            </blockquote>
          );
        }

        const isOpeningParagraph = !renderedFirstParagraph;
        renderedFirstParagraph = true;

        return (
          <p
            key={idx}
            className={`whitespace-pre-line ${
              isOpeningParagraph
                ? "first-letter:text-5xl first-letter:font-['Playfair_Display'] first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.88] first-letter:text-[#8A5A5C]"
                : ''
            }`}
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function BlogsPage({ onOpenBooking }: BlogsPageProps) {
  const { blogPosts } = useStudio();
  const [selectedCategory, setSelectedCategory] = useState<'All' | BlogCategory>('All');
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const publishedPosts = useMemo(
    () => blogPosts.filter((post) => post.published),
    [blogPosts],
  );

  const availableCategories = useMemo(() => {
    const present = new Set(publishedPosts.map((post) => post.category));
    return BLOG_CATEGORIES.filter((cat) => present.has(cat));
  }, [publishedPosts]);

  const effectiveCategory =
    selectedCategory === 'All' || availableCategories.includes(selectedCategory)
      ? selectedCategory
      : 'All';

  const filteredPosts = useMemo(() => {
    if (effectiveCategory === 'All') return publishedPosts;
    return publishedPosts.filter((post) => post.category === effectiveCategory);
  }, [publishedPosts, effectiveCategory]);

  const activePost: BlogPost | null = useMemo(() => {
    if (!activePostId) return null;
    return publishedPosts.find((p) => p.id === activePostId) ?? null;
  }, [activePostId, publishedPosts]);

  const leadPost = useMemo(() => {
    if (filteredPosts.length === 0) return null;
    return filteredPosts.find((p) => p.featured) ?? filteredPosts[0];
  }, [filteredPosts]);

  const gridPosts = useMemo(() => {
    if (!leadPost) return filteredPosts;
    return filteredPosts.filter((p) => p.id !== leadPost.id);
  }, [filteredPosts, leadPost]);

  const relatedPosts = useMemo(() => {
    if (!activePost) return [];
    return publishedPosts.filter((p) => p.id !== activePost.id).slice(0, 2);
  }, [activePost, publishedPosts]);

  const openArticle = (postId: string) => {
    setActivePostId(postId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Focused Long-Form Article Reader View
  if (activePost) {
    return (
      <article className="bg-[#F2ECEB] min-h-[78vh] py-8 sm:py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Reader Top Utility Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setActivePostId(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#554C4B] hover:text-[#141212] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Studio Journal</span>
            </button>
          </div>

          {/* Article Masthead */}
          <header className="space-y-4">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-medium text-[#8A5A5C]">
              {activePost.category} · {activePost.readTimeMin} min read ·{' '}
              {formatBlogDate(activePost.createdAt)}
            </p>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-[44px] font-semibold text-[#141212] leading-[1.14] tracking-tight">
              {activePost.title}
            </h1>
            <p className="font-['Playfair_Display'] italic text-lg sm:text-xl text-[#554C4B] leading-relaxed">
              {activePost.excerpt}
            </p>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E2D8D7] text-xs text-[#554C4B]">
              <span>
                Written by <strong className="font-semibold text-[#141212]">{activePost.authorName}</strong>
              </span>
              <span>Love Those Nails by Eshin</span>
            </div>
          </header>

          {/* Editorial Cover Artwork */}
          <figure className="neu-surface p-3 sm:p-4">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#EBE3E2]">
              <BlogCoverImage src={activePost.coverImageUrl} alt={activePost.title} />
            </div>
            <figcaption className="text-xs font-['Playfair_Display'] italic text-[#554C4B] mt-3 px-1">
              Studio Note — {activePost.category}
            </figcaption>
          </figure>

          {/* Long-Form Body Prose */}
          <div className="pt-2">
            <BlogArticleBody content={activePost.content} />
          </div>

          <div className="neu-divider" />

          {/* Editorial Studio Booking CTA */}
          <div className="neu-surface p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-[#8A5A5C]">
                Private Chair Appointment
              </p>
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                Experience This Ritual in the Studio
              </h2>
              <p className="text-xs sm:text-sm text-[#554C4B] leading-relaxed">
                Reserve your session with Eshin for bespoke Korean builder overlays, natural nail care,
                or signature translucent sets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 neu-btn-ink text-sm font-medium shrink-0 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>

          {/* Continue Reading Shelf */}
          {relatedPosts.length > 0 && (
            <section className="pt-4 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                  More from the Journal
                </h2>
                <button
                  type="button"
                  onClick={() => setActivePostId(null)}
                  className="text-xs font-medium text-[#8A5A5C] hover:text-[#141212] underline underline-offset-4 cursor-pointer"
                >
                  All Stories
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {relatedPosts.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => openArticle(rel.id)}
                    className="neu-surface p-4 text-left flex flex-col gap-3 group cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EBE3E2]">
                      <BlogCoverImage
                        src={rel.coverImageUrl}
                        alt={rel.title}
                        className="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A5A5C] font-medium">
                      {rel.category} · {rel.readTimeMin} min read
                    </p>
                    <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#141212] leading-snug group-hover:text-[#8A5A5C] transition-colors">
                      {rel.title}
                    </h3>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="bg-[#F2ECEB] min-h-[78vh] py-8 sm:py-12 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-10">
        {/* Editorial Journal Masthead */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#8A5A5C]">
              The Atelier Journal · Care, Craft &amp; Color
            </p>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#141212] tracking-tight leading-[1.1]">
              Notes from Love Those Nails
            </h1>
            <p className="text-sm sm:text-base text-[#554C4B] leading-relaxed">
              Studio essays, natural nail recovery notes, seasonal syrup shade guides, and aftercare
              rituals curated by Eshin.
            </p>
          </div>

          {publishedPosts.length > 0 && (
            <p className="text-xs font-mono text-[#554C4B] tabular-nums shrink-0">
              {publishedPosts.length}{' '}
              {publishedPosts.length === 1 ? 'article' : 'articles'}
            </p>
          )}
        </div>

        {/* Clean Category Filter Strip — only lists categories with live published articles */}
        {availableCategories.length > 0 && (
          <div className="border-y border-[#E2D8D7] py-3 flex items-center gap-5 sm:gap-7 overflow-x-auto">
            {(['All', ...availableCategories] as const).map((cat) => {
              const active = effectiveCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs sm:text-sm whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-[#8A5A5C] text-[#141212] font-semibold'
                      : 'border-transparent text-[#554C4B] hover:text-[#141212] font-medium'
                  }`}
                >
                  {cat === 'All' ? 'All Stories' : cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredPosts.length === 0 ? (
          <div className="neu-surface p-10 sm:p-14 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-14 h-14 mx-auto neu-inset rounded-2xl flex items-center justify-center text-[#8A5A5C]">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
              {effectiveCategory === 'All'
                ? 'New Studio Stories Coming Soon'
                : `No Articles in ${effectiveCategory} Yet`}
            </h2>
            <p className="text-sm text-[#554C4B] max-w-md mx-auto leading-relaxed">
              {effectiveCategory === 'All'
                ? 'Eshin will be sharing fresh nail care guides and studio notes here soon.'
                : 'Select another topic above or return to view all published articles.'}
            </p>
            {effectiveCategory !== 'All' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                >
                  View All Stories
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Tier 1: Featured Lead Story Split */}
            {leadPost && (
              <article className="neu-surface p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-center">
                <button
                  type="button"
                  onClick={() => openArticle(leadPost.id)}
                  className="lg:col-span-7 neu-inset p-2.5 rounded-2xl overflow-hidden block group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141212]"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EBE3E2]">
                    <BlogCoverImage
                      src={leadPost.coverImageUrl}
                      alt={leadPost.title}
                      className="transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </button>

                <div className="lg:col-span-5 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A5A5C]">
                    {leadPost.featured ? 'Featured Essay' : 'Latest Issue'} · {leadPost.category}
                  </p>

                  <button
                    type="button"
                    onClick={() => openArticle(leadPost.id)}
                    className="text-left block group cursor-pointer"
                  >
                    <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#141212] leading-[1.16] group-hover:text-[#8A5A5C] transition-colors">
                      {leadPost.title}
                    </h2>
                  </button>

                  <p className="text-sm sm:text-base text-[#554C4B] leading-relaxed">
                    {leadPost.excerpt}
                  </p>

                  <div className="neu-divider" />

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-[#554C4B]">
                      By <span className="font-semibold text-[#141212]">{leadPost.authorName}</span> ·{' '}
                      {leadPost.readTimeMin} min read · {formatBlogDate(leadPost.createdAt)}
                    </p>

                    <button
                      type="button"
                      onClick={() => openArticle(leadPost.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-ink text-xs sm:text-sm font-medium cursor-pointer"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* Tier 2: Secondary Editorial Grid */}
            {gridPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {gridPosts.map((post) => (
                  <article
                    key={post.id}
                    className="neu-surface p-5 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => openArticle(post.id)}
                        className="w-full neu-inset p-2 rounded-2xl block overflow-hidden cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141212]"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EBE3E2]">
                          <BlogCoverImage
                            src={post.coverImageUrl}
                            alt={post.title}
                            className="transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>
                      </button>

                      <div className="px-1 space-y-2.5">
                        <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-[#8A5A5C]">
                          {post.category} · {post.readTimeMin} min read
                        </p>

                        <button
                          type="button"
                          onClick={() => openArticle(post.id)}
                          className="text-left block group cursor-pointer"
                        >
                          <h3 className="font-['Playfair_Display'] text-xl sm:text-[22px] font-semibold text-[#141212] leading-snug group-hover:text-[#8A5A5C] transition-colors">
                            {post.title}
                          </h3>
                        </button>

                        <p className="text-sm text-[#554C4B] leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="px-1 pt-2 space-y-3">
                      <div className="neu-divider" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-[#554C4B]">
                          By <strong className="font-medium text-[#141212]">{post.authorName}</strong> ·{' '}
                          {formatBlogDate(post.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openArticle(post.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141212] hover:text-[#8A5A5C] transition-colors cursor-pointer shrink-0"
                        >
                          <span>Read Story</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
