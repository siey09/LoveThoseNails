import type {
  ArtistItem,
  BlogPost,
  BookingAddon,
  NailShape,
  RetailProduct,
  ServiceItem,
} from '../types/studio';

export const STUDIO_TIME_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM',
];

export const NAIL_SHAPES: NailShape[] = ['Almond', 'Coffin', 'Oval', 'Square', 'Stiletto'];

export const SIGNATURE_SHADES = [
  { name: 'Dusty Rose', hex: '#D2AAAB', note: 'House signature warm mauve-blush' },
  { name: 'Alabaster Milk', hex: '#F3ECE8', note: 'Sheer Korean syrup jelly' },
  { name: 'Rosewood Chrome', hex: '#B4827E', note: 'Glazed rose pearl sheen' },
  { name: 'Espresso Velvet', hex: '#3A2827', note: 'Deep roasted cocoa lacquer' },
  { name: 'Bordeaux Silk', hex: '#6E2931', note: 'Rich wine cat-eye pigment' },
  { name: 'Sage Mist', hex: '#9BA898', note: 'Muted botanical celadon' },
];

export const BOOKING_ADDONS: BookingAddon[] = [
  { id: 'addon-chrome', label: 'Glazed Pearl Chrome', price: 15, durationMin: 15 },
  { id: 'addon-french', label: 'Micro French Tip', price: 18, durationMin: 15 },
  { id: 'addon-removal', label: 'Gentle Soak-Off Removal', price: 20, durationMin: 20 },
  { id: 'addon-charms', label: '3D Sculpture & Charms (2 Nails)', price: 16, durationMin: 15 },
  { id: 'addon-repair', label: 'Silk Wrap Nail Repair', price: 10, durationMin: 10 },
];

export const SEED_SERVICES: Omit<ServiceItem, 'updatedAt'>[] = [
  {
    id: 'srv-eshin-signature-gelx',
    name: 'Eshin Signature Gel-X Set',
    category: 'Gel-X & Extensions',
    description:
      'Full-cover soft gel extensions sculpted to your natural nail bed with precision Russian cuticle work and single-tone glossy finish.',
    durationMin: 90,
    price: 95,
    featured: true,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'srv-korean-syrup-biab',
    name: 'Korean Syrup BIAB Overlay',
    category: 'BIAB & Builder',
    description:
      'Strengthening builder-in-a-bottle overlay using translucent Japanese and Korean syrup gels for natural length retention.',
    durationMin: 75,
    price: 78,
    featured: true,
    active: true,
    sortOrder: 2,
  },
  {
    id: 'srv-bespoke-tier2-art',
    name: 'Atelier Bespoke Art Set',
    category: 'Signature Nail Art',
    description:
      'Custom hand-painted botanicals, chrome aura gradients, cat-eye velvet swirls, or architectural linework across all ten nails.',
    durationMin: 120,
    price: 130,
    featured: true,
    active: true,
    sortOrder: 3,
  },
  {
    id: 'srv-structured-hard-gel',
    name: 'Structured Hard Gel Sculpt',
    category: 'BIAB & Builder',
    description:
      'Apex-balanced hard gel fill or fresh sculpt engineered for durable four-week wear without lifting.',
    durationMin: 85,
    price: 88,
    featured: false,
    active: true,
    sortOrder: 4,
  },
  {
    id: 'srv-russian-dry-mani',
    name: 'Russian Dry E-File Manicure',
    category: 'Manicure & Spa',
    description:
      'Detailed e-file cuticle refinement, nail plate buffing, botanical cuticle oil infusion, and warm towel finish.',
    durationMin: 55,
    price: 62,
    featured: false,
    active: true,
    sortOrder: 5,
  },
  {
    id: 'srv-minimalist-accent',
    name: 'Minimalist Accent Gel Manicure',
    category: 'Signature Nail Art',
    description:
      'Soft gel manicure paired with delicate micro-dots, foil leaf, or negative-space French accents on four feature nails.',
    durationMin: 75,
    price: 84,
    featured: false,
    active: true,
    sortOrder: 6,
  },
  {
    id: 'srv-rose-quartz-pedi',
    name: 'Rosewater Gel Pedicure',
    category: 'Manicure & Spa',
    description:
      'Mineral rose soak, callus smoothing, exfoliating sugar scrub, hot stone lower-leg massage, and chip-free gel polish.',
    durationMin: 70,
    price: 85,
    featured: false,
    active: true,
    sortOrder: 7,
  },
  {
    id: 'srv-gentle-soak-off',
    name: 'Nourishing Gel Soak-Off & Care',
    category: 'Add-Ons & Removal',
    description:
      'Steam-assisted removal preserving natural keratin layers, finished with strengthening base serum and cuticle balm.',
    durationMin: 30,
    price: 28,
    featured: false,
    active: true,
    sortOrder: 8,
  },
];

export const SEED_ARTISTS: Omit<ArtistItem, 'updatedAt'>[] = [
  {
    id: 'art-eshin',
    name: 'Eshin',
    role: 'Founder & Lead Nail Artist',
    specialty: 'Bespoke Editorial Art & Gel-X Architecture',
    bio: 'Trained in Seoul and Tokyo, Eshin founded Love Those Nails around meticulous cuticle health, ultra-thin apex shaping, and quiet luxury color theory.',
    workDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    active: true,
    accentTone: '#D2AAAB',
  },
  {
    id: 'art-mina',
    name: 'Mina Park',
    role: 'Senior Structural Gel Specialist',
    specialty: 'Korean BIAB Overlays & Russian Cuticle Care',
    bio: 'Known for glass-smooth builder overlays and natural nail recovery programs tailored to brittle or recovering nail beds.',
    workDays: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    active: true,
    accentTone: '#A68885',
  },
  {
    id: 'art-sora',
    name: 'Sora Lin',
    role: 'Micro-Art & Chrome Artist',
    specialty: 'Magnet Cat-Eye, 3D Gel & Aura Gradients',
    bio: 'Specializes in fine-line botanical illustration, magnetic velvet finishes, and sculptural translucent 3D gel detailing.',
    workDays: ['Tue', 'Thu', 'Fri', 'Sat', 'Sun'],
    active: true,
    accentTone: '#8C6D6A',
  },
];

export const SEED_RETAIL: Omit<RetailProduct, 'updatedAt'>[] = [
  {
    id: 'ret-cuticle-elixir',
    name: 'Eshin Rosehip Cuticle Elixir',
    category: 'Cuticle Care',
    description:
      'Cold-pressed jojoba, sweet almond, and damask rosehip oil blend in a precision dropper bottle for daily nail bed hydration.',
    price: 24,
    stock: 18,
    shadeHex: '#D2AAAB',
    active: true,
  },
  {
    id: 'ret-hand-velvet',
    name: 'Alabaster Silk Hand Cream',
    category: 'Hand Ritual',
    description:
      'Fast-absorbing ceramide and shea hand emulsion scented lightly with white tea and cedarwood—zero greasy residue on glossy gel.',
    price: 32,
    stock: 14,
    shadeHex: '#EAE2DF',
    active: true,
  },
  {
    id: 'ret-crystal-file',
    name: 'Bohemian Etched Glass File',
    category: 'Tools & Prep',
    description:
      'Tempered Czech crystal file that seals keratin edges smoothly to prevent peeling between studio visits. Includes suede sleeve.',
    price: 18,
    stock: 25,
    shadeHex: '#D8C2BF',
    active: true,
  },
  {
    id: 'ret-presson-dusty',
    name: 'Signature Dusty Rose Press-On Set',
    category: 'Press-On Sets',
    description:
      'Hand-painted salon-grade soft gel press-on kit (24 custom-graded tips) in House Dusty Rose with prep kit and dual-wear tabs.',
    price: 58,
    stock: 9,
    shadeHex: '#D2AAAB',
    active: true,
  },
];

export const STUDIO_BLOG_COVERS = [
  {
    label: 'BIAB Ritual',
    url: '/assets/blog/blog_biab_ritual.jpg',
  },
  {
    label: 'Korean Syrup Set',
    url: '/assets/blog/blog_syrup_manicure.jpg',
  },
  {
    label: 'Cuticle Apothecary',
    url: '/assets/blog/blog_cuticle_care.jpg',
  },
];

export const SEED_BLOGS: Omit<BlogPost, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'blog_korean_biab_recovery',
    title: 'Why Korean BIAB Is Changing Natural Nail Recovery',
    category: 'Nail Care & Health',
    excerpt:
      'How breathable builder-in-a-bottle overlays protect thin, peeling nail plates while building glassy, natural-looking strength over four weeks.',
    content: `Healthy natural length rarely happens overnight. For clients transitioning away from harsh acrylics or chronic nail biting, the biggest hurdle is preventing mid-week corner splits while your fresh keratin grows out.

## Precision Prep Before Pigment
Every BIAB session at Love Those Nails begins with gentle Russian dry cuticle refinement. By clearing non-living eponychium tissue without water soaking, the nail plate stays dry and stable—allowing thin builder gel layers to bond cleanly with zero premature lifting.

> Strength should feel weightless on the nail bed, never bulky or rigid at the free edge.

## Structured Apex Balance
Instead of flooding the entire nail thickly, we float a micro-apex at the stress zone and taper into an ultra-sheer cuticle edge. As your nails grow out over three to four weeks, the transition stays seamless and snag-free.

## Keeping Your Overlay Radiant
Pair your appointment with nightly jojoba and rosehip cuticle oil. Hydrated skin around the proximal fold keeps natural keratin flexible and prevents hairline lifting around the edges.`,
    coverImageUrl: '/assets/blog/blog_biab_ritual.jpg',
    authorName: 'Eshin',
    readTimeMin: 4,
    featured: true,
    published: true,
    authorId: 'studio_seed',
  },
  {
    id: 'blog_syrup_jelly_palette',
    title: 'Translucent Syrup Gels: The Quiet Luxury Color Edit',
    category: 'Seasonal Trends',
    excerpt:
      'Inside our studio palette of milky alabaster, dusty rosewater, and toasted espresso jellies designed to flatter every skin undertone.',
    content: `Opaques make a statement, but translucent syrup gels bring something softer to the hands—depth that shifts naturally in sunlight and catches studio warmth like tinted glass.

## Layering Sheer Depth
Unlike single-coat creams that can look flat or chalky near the cuticle, Korean syrup pigments are built in two to three gossamer passes. Each thin cure deepens the blush heart of the nail while keeping the lunula soft and diffused.

> The secret to effortless neutral nails is choosing a rose tone one shade warmer than your natural nail bed.

## Pairing Finishes Without Clutter
Dusty Rose syrup pairs effortlessly with a micro-fine pearl chrome glaze or an ultra-thin French tip. Whether you prefer clean short ovals or tapered almonds, sheer finishes grow out gracefully past week three.`,
    coverImageUrl: '/assets/blog/blog_syrup_manicure.jpg',
    authorName: 'Eshin',
    readTimeMin: 3,
    featured: false,
    published: true,
    authorId: 'studio_seed',
  },
  {
    id: 'blog_aftercare_rituals',
    title: 'Five Daily Rituals to Make Your Gel-X Set Last Four Weeks',
    category: 'Aftercare Guide',
    excerpt:
      'Simple daily habits—from glass filing to glove-first dishwashing—that keep glossy retention crisp between studio visits.',
    content: `Fresh salon craftsmanship does half the work; small everyday habits after you leave the chair determine whether your set looks newly cured on day twenty-five.

## 1. Oil Before Bed, Not Before Booking
Applying a drop of botanical cuticle oil before sleep nourishes the nail matrix and keeps sidewalls supple. Avoid heavy hand balms immediately prior to an infill appointment so our prep remains oil-free.

## 2. Never Use Nails as Tools
Popping soda tabs, peeling shipping labels, or prying lids places sudden torque directly on the stress point. Keep a small card or opener handy so your apex stays intact.

## 3. Gloves for Hot Water & Cleansers
Extended soaking in hot dishwater causes natural keratin to expand and contract underneath cured gel. Slipping on cotton-lined gloves preserves high-gloss topcoat shine and cuticle seal.

> Never peel or force off lifted gel—schedule a 30-minute steam soak-off to keep natural keratin intact.`,
    coverImageUrl: '/assets/blog/blog_cuticle_care.jpg',
    authorName: 'Eshin',
    readTimeMin: 4,
    featured: false,
    published: true,
    authorId: 'studio_seed',
  },
];

