import type {
  ArtistItem,
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
