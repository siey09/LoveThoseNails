import { ShoppingBag } from 'lucide-react';
import { useStudio } from '../context/StudioContext';

export function RetailSection() {
  const { retailProducts, addToCart, cart, setIsBagOpen } = useStudio();
  const activeProducts = retailProducts.filter((p) => p.active);
  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section id="care-shop" className="bg-[#F2ECEB]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="neu-divider mb-10 sm:mb-14" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
              Studio Care Apothecary
            </p>
            <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-semibold text-[#141212]">
              Aftercare rituals for between-visit longevity
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsBagOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tabular-nums">Studio Bag ({bagCount})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
          {activeProducts.map((product) => {
            const outOfStock = product.stock <= 0;
            return (
              <article
                key={product.id}
                className="neu-surface p-5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="h-44 neu-inset p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-[#554C4B]">
                      <span>{product.category}</span>
                      <span className="font-mono tabular-nums">
                        {outOfStock ? 'Out of stock' : `${product.stock} in studio`}
                      </span>
                    </div>

                    <div className="flex items-center justify-center py-2">
                      <div
                        className="w-16 h-20 rounded-xl shadow-[4px_4px_10px_rgba(148,124,124,0.4),-3px_-3px_8px_rgba(255,255,255,0.8)] flex items-end justify-center pb-2"
                        style={{ backgroundColor: product.shadeHex || '#D2AAAB' }}
                      >
                        <span className="text-[10px] tracking-[0.16em] uppercase font-semibold text-[#141212] bg-[#F2ECEB]/90 px-1.5 py-0.5 rounded">
                          ESHIN
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 pb-4 px-1 space-y-2">
                    <h3 className="text-base font-semibold text-[#141212]">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#554C4B] leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 px-1">
                  <div className="neu-divider mb-4" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono tabular-nums text-base font-semibold text-[#141212]">
                      ${product.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(product)}
                      className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                        outOfStock
                          ? 'neu-inset text-[#554C4B] cursor-not-allowed'
                          : 'neu-btn-ink cursor-pointer'
                      }`}
                    >
                      {outOfStock ? 'Unavailable' : 'Add to Bag'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
