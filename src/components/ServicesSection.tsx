import { useMemo, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import type { ServiceCategory, ServiceItem } from '../types/studio';

const CATEGORIES: ('All' | ServiceCategory)[] = [
  'All',
  'Gel-X & Extensions',
  'BIAB & Builder',
  'Signature Nail Art',
  'Manicure & Spa',
  'Add-Ons & Removal',
];

interface ServicesSectionProps {
  onBookService: (service: ServiceItem) => void;
}

export function ServicesSection({ onBookService }: ServicesSectionProps) {
  const { services } = useStudio();
  const [selectedCategory, setSelectedCategory] = useState<'All' | ServiceCategory>('All');

  const visibleServices = useMemo(() => {
    const active = services.filter((s) => s.active);
    if (selectedCategory === 'All') return active;
    return active.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  return (
    <section id="services" className="bg-[#F2ECEB]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="neu-divider mb-10 sm:mb-14" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
              Treatment Menu
            </p>
            <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-semibold text-[#141212]">
              Curated nail services and restorative care
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter services by category"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 neu-inset p-1.5 w-full lg:w-auto"
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 sm:px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'neu-btn-ink'
                      : 'text-[#554C4B] hover:text-[#141212]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
          {visibleServices.map((service) => (
            <article
              key={service.id}
              className="neu-surface p-5 sm:p-7 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 text-xs text-[#554C4B]">
                  <span>{service.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{service.durationMin} min</span>
                </div>

                <h3 className="text-lg font-semibold text-[#141212]">
                  {service.name}
                </h3>

                <p className="text-sm text-[#554C4B] leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="pt-6 mt-6">
                <div className="neu-divider mb-5" />
                <div className="flex items-center justify-between gap-4">
                  <div className="font-mono tabular-nums text-lg font-semibold text-[#141212]">
                    ${service.price.toFixed(0)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookService(service)}
                    className="px-4 py-2 neu-btn-rose text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Book Treatment
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
