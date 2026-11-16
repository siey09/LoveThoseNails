import { useState } from 'react';
import { NAIL_SHAPES, SIGNATURE_SHADES } from '../data/seedCatalog';
import type { LookbookPreset, NailShape } from '../types/studio';
import { NailShapePreview } from './NailArtVisuals';

interface LookbookSectionProps {
  onBookLook: (preset: LookbookPreset) => void;
}

const FINISHES: LookbookPreset['finish'][] = ['Glossy', 'Pearl Chrome', 'French Tip'];

export function LookbookSection({ onBookLook }: LookbookSectionProps) {
  const [shape, setShape] = useState<NailShape>('Almond');
  const [selectedShade, setSelectedShade] = useState(SIGNATURE_SHADES[0]);
  const [finish, setFinish] = useState<LookbookPreset['finish']>('Glossy');

  return (
    <section id="lookbook" className="bg-[#F2ECEB]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 space-y-10 sm:space-y-12">
        <div className="neu-divider" />

        {/* Interactive Nail Shape & Shade Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 neu-surface p-5 sm:p-8 flex flex-col items-center justify-between">
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-[#554C4B]">
              <span>Atelier Preview</span>
              <span className="font-mono">{shape} · {finish}</span>
            </div>

            <div className="my-5 sm:my-6 w-full py-6 sm:py-8 neu-inset flex items-center justify-center">
              <NailShapePreview
                shape={shape}
                shadeHex={selectedShade.hex}
                finish={finish}
              />
            </div>

            <div className="w-full pt-3 sm:pt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#141212]">{selectedShade.name}</p>
                <p className="text-xs text-[#554C4B]">{selectedShade.note}</p>
              </div>
              <span
                className="w-8 h-8 rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18),2px_2px_6px_rgba(176,152,152,0.4),-2px_-2px_6px_rgba(255,255,255,0.9)] shrink-0"
                style={{ backgroundColor: selectedShade.hex }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between space-y-6 sm:space-y-8 p-1 sm:p-4">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
                Shape &amp; Pigment Studio
              </p>
              <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-semibold text-[#141212]">
                Customize your silhouette and house shade
              </h2>
              <p className="text-sm text-[#554C4B] max-w-xl leading-relaxed">
                Preview our five signature nail architectures paired with Eshin&apos;s curated
                Korean and Japanese pigments, then attach your selection directly to your
                appointment request.
              </p>
            </div>

            <div className="space-y-6">
              {/* Shape Selector */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#141212]">01. Select Nail Shape</p>
                <div className="flex flex-wrap gap-3">
                  {NAIL_SHAPES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setShape(item)}
                      className={`px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                        shape === item
                          ? 'neu-btn-ink'
                          : 'neu-btn text-[#554C4B] hover:text-[#141212]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shade Selector */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#141212]">02. Select House Pigment</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SIGNATURE_SHADES.map((shade) => {
                    const isSelected = selectedShade.name === shade.name;
                    return (
                      <button
                        key={shade.name}
                        type="button"
                        onClick={() => setSelectedShade(shade)}
                        className={`flex items-center gap-3 p-3 text-left cursor-pointer ${
                          isSelected
                            ? 'neu-inset ring-2 ring-[#D2AAAB]/80'
                            : 'neu-btn'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-md shadow-[1px_1px_3px_rgba(0,0,0,0.18)] shrink-0"
                          style={{ backgroundColor: shade.hex }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium text-[#141212] truncate">
                          {shade.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Finish Selector */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#141212]">03. Select Surface Finish</p>
                <div className="flex flex-wrap gap-3">
                  {FINISHES.map((fin) => (
                    <button
                      key={fin}
                      type="button"
                      onClick={() => setFinish(fin)}
                      className={`px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                        finish === fin
                          ? 'neu-btn-rose font-semibold'
                          : 'neu-btn text-[#554C4B] hover:text-[#141212]'
                      }`}
                    >
                      {fin}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="neu-divider" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-[#554C4B]">
                  Selected look: <strong className="text-[#141212]">{shape}</strong> ·{' '}
                  <strong className="text-[#141212]">{selectedShade.name}</strong> ·{' '}
                  <strong className="text-[#141212]">{finish}</strong>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onBookLook({
                      shape,
                      shadeName: selectedShade.name,
                      shadeHex: selectedShade.hex,
                      finish,
                    })
                  }
                  className="px-5 py-2.5 neu-btn-ink text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Book With This Look
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
