import { Calendar, ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import type { GalleryPost } from '../types/studio';
import type { BookingModalInitialState } from './BookingModal';

interface GalleryPageProps {
  onOpenBooking: (preset?: BookingModalInitialState) => void;
}

function formatPostDate(ts: unknown): string {
  if (!ts) return 'Recently';
  try {
    const maybeObj = ts as { toDate?: () => Date; seconds?: number };
    const date =
      typeof maybeObj.toDate === 'function'
        ? maybeObj.toDate()
        : typeof maybeObj.seconds === 'number'
          ? new Date(maybeObj.seconds * 1000)
          : new Date(String(ts));
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function GalleryPage({ onOpenBooking }: GalleryPageProps) {
  const { galleryPosts } = useStudio();
  const [lightboxPost, setLightboxPost] = useState<GalleryPost | null>(null);

  const handleBookLook = (post: GalleryPost) => {
    onOpenBooking({
      lookbook: {
        shape: post.nailShape,
        shadeName: post.shadeName || 'Dusty Rose',
        shadeHex: '#D2AAAB',
        finish: 'Glossy',
      },
    });
  };

  return (
    <div className="bg-[#F2ECEB] min-h-[75vh] py-8 sm:py-12 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#554C4B]">
              Studio Portfolio · Recent Works
            </p>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#141212]">
              Nail Gallery by Eshin
            </h1>
            <p className="text-sm sm:text-base text-[#554C4B] leading-relaxed">
              Recent client sets, bespoke hand-painted nail art, and translucent BIAB finishes
              straight from the studio chair.
            </p>
          </div>
          {galleryPosts.length > 0 && (
            <p className="text-xs font-mono text-[#554C4B] tabular-nums shrink-0">
              {galleryPosts.length} {galleryPosts.length === 1 ? 'work' : 'works'}
            </p>
          )}
        </div>

        <div className="neu-divider" />

        {/* Gallery Grid */}
        {galleryPosts.length === 0 ? (
          <div className="neu-surface p-10 sm:p-14 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-14 h-14 mx-auto neu-inset rounded-2xl flex items-center justify-center text-[#8A5A5C]">
              <ImagePlus className="w-6 h-6" />
            </div>
            <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
              Studio Gallery Awaits Its First Set
            </h2>
            <p className="text-sm text-[#554C4B] max-w-md mx-auto leading-relaxed">
              Eshin will be posting fresh nail sets and studio inspiration here soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {galleryPosts.map((post) => (
              <article
                key={post.id}
                className="neu-surface p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setLightboxPost(post)}
                    className="w-full neu-inset p-2 rounded-2xl block overflow-hidden cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141212]"
                  >
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#EBE3E2]">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  </button>

                  <div className="px-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#141212] leading-snug">
                        {post.title}
                      </h2>
                      {post.featured && (
                        <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8A5A5C] shrink-0">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[#554C4B]">
                      {post.nailShape}
                      {post.shadeName ? ` · ${post.shadeName}` : ''} · By {post.artistName}
                    </p>

                    <p className="text-sm text-[#554C4B] leading-relaxed line-clamp-3">
                      {post.caption}
                    </p>
                  </div>
                </div>

                <div className="px-1 pt-2 space-y-3">
                  <div className="neu-divider" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[#554C4B]">
                      {formatPostDate(post.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBookLook(post)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 neu-btn-rose text-xs font-medium cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Similar Set</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {lightboxPost && (
        <div
          className="fixed inset-0 z-50 bg-[#141212]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxPost.title}
        >
          <div className="w-full max-w-3xl neu-surface max-h-[92vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
                  {lightboxPost.nailShape}
                  {lightboxPost.shadeName ? ` · ${lightboxPost.shadeName}` : ''}
                </p>
                <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212] mt-1">
                  {lightboxPost.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPost(null)}
                aria-label="Close photo view"
                className="p-2.5 neu-btn text-[#141212] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 neu-inset p-2.5 rounded-2xl">
                <img
                  src={lightboxPost.imageUrl}
                  alt={lightboxPost.title}
                  className="w-full max-h-[60vh] object-cover rounded-xl"
                />
              </div>
              <div className="md:col-span-5 space-y-5">
                <div className="space-y-2 text-sm text-[#554C4B] leading-relaxed">
                  <p>{lightboxPost.caption}</p>
                </div>
                <div className="neu-divider" />
                <div className="space-y-2 text-xs text-[#554C4B]">
                  <div className="flex justify-between">
                    <span>Shape</span>
                    <span className="font-medium text-[#141212]">{lightboxPost.nailShape}</span>
                  </div>
                  {lightboxPost.shadeName && (
                    <div className="flex justify-between">
                      <span>Shade</span>
                      <span className="font-medium text-[#141212]">{lightboxPost.shadeName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Artist</span>
                    <span className="font-medium text-[#141212]">{lightboxPost.artistName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Posted</span>
                    <span className="font-mono text-[#141212]">
                      {formatPostDate(lightboxPost.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const post = lightboxPost;
                    setLightboxPost(null);
                    handleBookLook(post);
                  }}
                  className="w-full py-3 neu-btn-ink text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Similar Set</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
