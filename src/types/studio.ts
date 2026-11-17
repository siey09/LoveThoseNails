export type ServiceCategory =
  | 'Gel-X & Extensions'
  | 'BIAB & Builder'
  | 'Signature Nail Art'
  | 'Manicure & Spa'
  | 'Add-Ons & Removal';

export type RetailCategory =
  | 'Cuticle Care'
  | 'Hand Ritual'
  | 'Tools & Prep'
  | 'Press-On Sets';

export type NailShape = 'Almond' | 'Coffin' | 'Oval' | 'Square' | 'Stiletto';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_chair'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid';

export type RetailOrderStatus = 'reserved' | 'ready' | 'picked_up' | 'cancelled';

export type PaymentMethod = 'Card' | 'Cash' | 'Apple Pay' | 'Gift Card';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMin: number;
  price: number;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface ArtistItem {
  id: string;
  name: string;
  role: string;
  specialty: string;
  bio: string;
  workDays: string[];
  active: boolean;
  accentTone: string;
  updatedAt?: unknown;
}

export interface RetailProduct {
  id: string;
  name: string;
  category: RetailCategory;
  description: string;
  price: number;
  stock: number;
  shadeHex: string;
  active: boolean;
  updatedAt?: unknown;
}

export interface BookedSlot {
  id: string;
  appointmentId: string;
  artistId: string;
  date: string;
  timeSlot: string;
  durationMin: number;
  status: 'active' | 'cancelled';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Appointment {
  id: string;
  bookingCode: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  artistId: string;
  artistName: string;
  date: string;
  timeSlot: string;
  durationMin: number;
  totalPrice: number;
  nailShape: NailShape;
  shadePreference: string;
  addons: string[];
  notes: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RetailOrder {
  id: string;
  orderCode: string;
  clientId: string;
  clientName: string;
  itemNames: string[];
  totalAmount: number;
  pickupDate: string;
  status: RetailOrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PosTransaction {
  id: string;
  txCode: string;
  appointmentId: string;
  clientName: string;
  summary: string;
  subtotal: number;
  tip: number;
  total: number;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  createdAt?: unknown;
}

export interface UserPrivateProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  preferredShape: NailShape;
  preferredShade: string;
  allergiesOrNotes: string;
  loyaltyPoints: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  product: RetailProduct;
  quantity: number;
}

export interface BookingAddon {
  id: string;
  label: string;
  price: number;
  durationMin: number;
}

export interface LookbookPreset {
  shape: NailShape;
  shadeName: string;
  shadeHex: string;
  finish: 'Glossy' | 'Pearl Chrome' | 'French Tip';
}

export interface EmailLog {
  id: string;
  appointmentId: string;
  clientId: string;
  clientEmail: string;
  bookingCode: string;
  date: string;
  timeSlot: string;
  confirmationSentAt?: unknown;
  dayBeforeReminderSentAt?: unknown;
  oneHourReminderSentAt?: unknown;
  lastStatusNotified: AppointmentStatus;
  lastError?: string | null;
  updatedAt?: unknown;
}

export type GalleryCategory =
  | 'Gel-X & Extensions'
  | 'BIAB & Builder'
  | 'Signature Nail Art'
  | 'Manicure & Spa'
  | 'French & Chrome';

export interface GalleryPost {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  category: GalleryCategory;
  nailShape: NailShape;
  shadeName: string;
  artistName: string;
  featured: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LoyaltyCard {
  id: string;
  uid: string;
  clientName: string;
  clientEmail: string;
  cardCode: string;
  stamps: number;
  totalVisits: number;
  rewardsRedeemed: number;
  rewardNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudioScheduleConfig {
  openWeekdays: number[];
  timeSlots: string[];
  weekdaySlots?: Record<string, string[]>;
  updatedAt?: unknown;
}

export type DayOverrideStatus = 'default' | 'open' | 'closed';

export interface DayScheduleOverride {
  date: string;
  dayStatus: DayOverrideStatus;
  blockedSlots: string[];
  extraSlots: string[];
  updatedAt?: unknown;
}

export type BlogCategory =
  | 'Nail Care & Health'
  | 'Seasonal Trends'
  | 'Aftercare Guide'
  | 'Studio Stories'
  | 'Behind the Chair';

export interface BlogPost {
  id: string;
  title: string;
  category: BlogCategory;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  authorName: string;
  readTimeMin: number;
  featured: boolean;
  published: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

