import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  adminGoogleProvider,
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  GmailAuthExpiredError,
  sendStudioBookingEmail,
  type BookingEmailType,
} from '../lib/gmail';
import { SEED_ARTISTS, SEED_BLOGS, SEED_RETAIL, SEED_SERVICES } from '../data/seedCatalog';
import { DEFAULT_STUDIO_SCHEDULE, sortTimeSlots } from '../lib/schedule';
import type {
  Appointment,
  AppointmentStatus,
  ArtistItem,
  BlogCategory,
  BlogPost,
  BookedSlot,
  CartItem,
  DayOverrideStatus,
  DayScheduleOverride,
  EmailLog,
  GalleryCategory,
  GalleryPost,
  LoyaltyCard,
  NailShape,
  PaymentMethod,
  PaymentStatus,
  PosTransaction,
  RetailOrder,
  RetailOrderStatus,
  RetailProduct,
  ServiceItem,
  StudioScheduleConfig,
  UserPrivateProfile,
} from '../types/studio';

interface CreateAppointmentInput {
  service: ServiceItem;
  artist: ArtistItem;
  date: string;
  timeSlot: string;
  nailShape: NailShape;
  shadePreference: string;
  addons: { label: string; price: number; durationMin: number }[];
  clientName: string;
  clientPhone: string;
  notes: string;
  isWalkInByAdmin?: boolean;
}

interface StudioContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  gmailConnected: boolean;
  catalogSynced: boolean;
  services: ServiceItem[];
  artists: ArtistItem[];
  retailProducts: RetailProduct[];
  bookedSlots: BookedSlot[];
  appointments: Appointment[];
  emailLogs: EmailLog[];
  retailOrders: RetailOrder[];
  posTransactions: PosTransaction[];
  profile: UserPrivateProfile | null;
  cart: CartItem[];
  isBagOpen: boolean;
  setIsBagOpen: (open: boolean) => void;
  addToCart: (product: RetailProduct) => void;
  updateCartQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  signInWithGoogle: () => Promise<User | null>;
  signInAdminWithGoogle: () => Promise<User | null>;
  connectAdminGmail: () => Promise<string>;
  signOutUser: () => Promise<void>;
  saveClientProfile: (
    data: Pick<
      UserPrivateProfile,
      'displayName' | 'phone' | 'preferredShape' | 'preferredShade' | 'allergiesOrNotes'
    >,
  ) => Promise<void>;
  createAppointment: (input: CreateAppointmentInput) => Promise<Appointment>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  adminUpdateAppointment: (
    appointmentId: string,
    updates: Partial<
      Pick<Appointment, 'status' | 'paymentStatus' | 'notes' | 'date' | 'timeSlot'>
    >,
  ) => Promise<void>;
  adminConfirmOrCancelWithEmail: (
    appointment: Appointment,
    nextStatus: BookingEmailType,
  ) => Promise<{ emailSent: boolean; messageId: string }>;
  adminRecordPosCheckout: (payload: {
    appointment?: Appointment;
    clientName: string;
    summary: string;
    subtotal: number;
    tip: number;
    paymentMethod: PaymentMethod;
  }) => Promise<PosTransaction>;
  createRetailOrder: (pickupDate: string, clientName: string) => Promise<RetailOrder>;
  adminUpdateRetailOrderStatus: (orderId: string, status: RetailOrderStatus) => Promise<void>;
  adminUpsertService: (service: Omit<ServiceItem, 'updatedAt'>) => Promise<void>;
  adminDeleteService: (serviceId: string) => Promise<void>;
  adminUpsertArtist: (artist: Omit<ArtistItem, 'updatedAt'>) => Promise<void>;
  adminDeleteArtist: (artistId: string) => Promise<void>;
  adminUpsertRetailProduct: (product: Omit<RetailProduct, 'updatedAt'>) => Promise<void>;
  adminDeleteRetailProduct: (productId: string) => Promise<void>;
  galleryPosts: GalleryPost[];
  adminCreateGalleryPost: (post: {
    title: string;
    caption: string;
    imageUrl: string;
    category: GalleryCategory;
    nailShape: NailShape;
    shadeName: string;
    artistName: string;
    featured: boolean;
  }) => Promise<GalleryPost>;
  adminUpdateGalleryPost: (
    postId: string,
    updates: {
      title: string;
      caption: string;
      imageUrl: string;
      category: GalleryCategory;
      nailShape: NailShape;
      shadeName: string;
      artistName: string;
      featured: boolean;
    },
  ) => Promise<void>;
  adminDeleteGalleryPost: (postId: string) => Promise<void>;
  blogPosts: BlogPost[];
  adminCreateBlogPost: (post: {
    title: string;
    category: BlogCategory;
    excerpt: string;
    content: string;
    coverImageUrl: string;
    authorName: string;
    readTimeMin: number;
    featured: boolean;
    published: boolean;
  }) => Promise<BlogPost>;
  adminUpdateBlogPost: (
    postId: string,
    updates: {
      title: string;
      category: BlogCategory;
      excerpt: string;
      content: string;
      coverImageUrl: string;
      authorName: string;
      readTimeMin: number;
      featured: boolean;
      published: boolean;
    },
  ) => Promise<void>;
  adminDeleteBlogPost: (postId: string) => Promise<void>;
  adminSeedStarterBlogs: () => Promise<void>;
  loyaltyCard: LoyaltyCard | null;
  allLoyaltyCards: LoyaltyCard[];
  loyaltyEnabled: boolean;
  careShopEnabled: boolean;
  scheduleConfig: StudioScheduleConfig;
  dayOverrides: Record<string, DayScheduleOverride>;
  adminSetLoyaltyEnabled: (enabled: boolean) => Promise<void>;
  adminSetCareShopEnabled: (enabled: boolean) => Promise<void>;
  adminUpdateStudioSchedule: (next: {
    openWeekdays: number[];
    timeSlots: string[];
    weekdaySlots?: Record<string, string[]>;
  }) => Promise<void>;
  adminUpdateDaySchedule: (
    date: string,
    updates: {
      dayStatus?: DayOverrideStatus;
      blockedSlots?: string[];
      extraSlots?: string[];
    },
  ) => Promise<void>;
  adminGrantLoyaltyStamp: (cardId: string, delta?: number) => Promise<void>;
  adminCreateOrStampByEmail: (payload: {
    email: string;
    clientName?: string;
    initialStamps?: number;
  }) => Promise<{ created: boolean; cardCode: string; stamps: number; clientEmail: string }>;
  adminRedeemLoyaltyReward: (cardId: string) => Promise<void>;
  seedCatalogToFirestore: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function generateCode(prefix: 'LTN' | 'ORD' | 'POS' | 'VIP'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${out}`;
}

function generateId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

function clampStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

let cachedGmailAccessToken: string | null = null;

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminRecord, setIsAdminRecord] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(Boolean(cachedGmailAccessToken));

  const [remoteServices, setRemoteServices] = useState<ServiceItem[] | null>(null);
  const [remoteArtists, setRemoteArtists] = useState<ArtistItem[] | null>(null);
  const [remoteRetail, setRemoteRetail] = useState<RetailProduct[] | null>(null);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [retailOrders, setRetailOrders] = useState<RetailOrder[]>([]);
  const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
  const [galleryPosts, setGalleryPosts] = useState<GalleryPost[]>([]);
  const [remoteBlogs, setRemoteBlogs] = useState<BlogPost[] | null>(null);
  const [blogsCleared, setBlogsCleared] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('ltn_blogs_cleared_v1') === '1';
    } catch {
      return false;
    }
  });
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [allLoyaltyCards, setAllLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [careShopEnabled, setCareShopEnabled] = useState(false);
  const [scheduleConfig, setScheduleConfig] =
    useState<StudioScheduleConfig>(DEFAULT_STUDIO_SCHEDULE);
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayScheduleOverride>>({});
  const [profile, setProfile] = useState<UserPrivateProfile | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const seededOnceRef = useRef(false);
  const seededBlogsOnceRef = useRef(false);
  const isGmailAuthInFlightRef = useRef(false);
  const loyaltyEnabledRef = useRef(true);
  const careShopEnabledRef = useRef(false);

  useEffect(() => {
    loyaltyEnabledRef.current = loyaltyEnabled;
  }, [loyaltyEnabled]);

  useEffect(() => {
    careShopEnabledRef.current = careShopEnabled;
    if (!careShopEnabled) {
      setIsBagOpen(false);
    }
  }, [careShopEnabled]);

  const isAdmin = useMemo(() => {
    if (!user || !user.emailVerified) return false;
    return (
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() || isAdminRecord
    );
  }, [user, isAdminRecord]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser && !isGmailAuthInFlightRef.current) {
        cachedGmailAccessToken = null;
        setGmailConnected(false);
      }
      const isBootstrapEmail =
        Boolean(nextUser?.emailVerified) &&
        nextUser?.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      if (nextUser && nextUser.emailVerified && isBootstrapEmail) {
        setIsAdminRecord(true);
        try {
          const adminRef = doc(db, 'admins', nextUser.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            await setDoc(adminRef, {
              uid: nextUser.uid,
              email: nextUser.email || BOOTSTRAP_ADMIN_EMAIL,
              grantedAt: serverTimestamp(),
            });
          }
        } catch {
          // Bootstrap email rule already grants admin privileges even before doc write
        }
      } else if (nextUser && nextUser.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
          setIsAdminRecord(adminSnap.exists());
        } catch {
          setIsAdminRecord(false);
        }
      } else {
        setIsAdminRecord(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authReady && !isAdmin && !isGmailAuthInFlightRef.current) {
      cachedGmailAccessToken = null;
      setGmailConnected(false);
    }
  }, [authReady, isAdmin]);

  // Public catalog listeners (services, artists, retailProducts, active bookedSlots)
  useEffect(() => {
    const unsubServices = onSnapshot(
      query(collection(db, 'services'), orderBy('sortOrder', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceItem, 'id'>) }));
        setRemoteServices(list);
      },
      (err) => {
        console.warn('Services listener fallback:', err.message);
        setRemoteServices([]);
      },
    );

    const unsubArtists = onSnapshot(
      collection(db, 'artists'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArtistItem, 'id'>) }));
        setRemoteArtists(list);
      },
      (err) => {
        console.warn('Artists listener fallback:', err.message);
        setRemoteArtists([]);
      },
    );

    const unsubRetail = onSnapshot(
      collection(db, 'retailProducts'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RetailProduct, 'id'>) }));
        setRemoteRetail(list);
      },
      (err) => {
        console.warn('Retail listener fallback:', err.message);
        setRemoteRetail([]);
      },
    );

    const unsubSlots = onSnapshot(
      query(collection(db, 'bookedSlots'), where('status', '==', 'active')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BookedSlot, 'id'>) }));
        setBookedSlots(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'bookedSlots');
      },
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'galleryPosts'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryPost, 'id'>) }));
        setGalleryPosts(list);
      },
      (err) => {
        console.warn('Gallery listener notice:', err.message);
        setGalleryPosts([]);
      },
    );

    const unsubSettings = onSnapshot(
      doc(db, 'studioSettings', 'studio'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { loyaltyEnabled?: boolean; careShopEnabled?: boolean };
          setLoyaltyEnabled(data.loyaltyEnabled !== false);
          setCareShopEnabled(data.careShopEnabled === true);
        } else {
          setLoyaltyEnabled(true);
          setCareShopEnabled(false);
        }
      },
      (err) => {
        console.warn('Studio settings fallback:', err.message);
      },
    );

    const unsubSchedule = onSnapshot(
      doc(db, 'studioSettings', 'schedule'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<StudioScheduleConfig>;
          const openWeekdays = Array.isArray(data.openWeekdays)
            ? data.openWeekdays.filter((d) => typeof d === 'number' && d >= 0 && d <= 6)
            : DEFAULT_STUDIO_SCHEDULE.openWeekdays;
          const timeSlots = Array.isArray(data.timeSlots)
            ? sortTimeSlots(data.timeSlots.filter((s) => typeof s === 'string'))
            : DEFAULT_STUDIO_SCHEDULE.timeSlots;
          const rawMap = data.weekdaySlots;
          const weekdaySlots: Record<string, string[]> = {};
          for (let d = 0; d <= 6; d += 1) {
            const key = String(d);
            if (rawMap && Array.isArray(rawMap[key])) {
              weekdaySlots[key] = sortTimeSlots(
                rawMap[key].filter((s) => typeof s === 'string'),
              );
            } else {
              weekdaySlots[key] = [...timeSlots];
            }
          }
          setScheduleConfig({ openWeekdays, timeSlots, weekdaySlots, updatedAt: data.updatedAt });
        } else {
          setScheduleConfig(DEFAULT_STUDIO_SCHEDULE);
        }
      },
      (err) => {
        console.warn('Studio schedule fallback:', err.message);
      },
    );

    const unsubDaySchedules = onSnapshot(
      collection(db, 'daySchedules'),
      (snap) => {
        const nextMap: Record<string, DayScheduleOverride> = {};
        for (const d of snap.docs) {
          const data = d.data() as DayScheduleOverride;
          if (data?.date) {
            nextMap[data.date] = {
              date: data.date,
              dayStatus: data.dayStatus || 'default',
              blockedSlots: Array.isArray(data.blockedSlots) ? data.blockedSlots : [],
              extraSlots: Array.isArray(data.extraSlots) ? data.extraSlots : [],
              updatedAt: data.updatedAt,
            };
          }
        }
        setDayOverrides(nextMap);
      },
      (err) => {
        console.warn('Day schedules listener notice:', err.message);
      },
    );

    return () => {
      unsubServices();
      unsubArtists();
      unsubRetail();
      unsubSlots();
      unsubGallery();
      unsubSettings();
      unsubSchedule();
      unsubDaySchedules();
    };
  }, []);

  // Seed Firestore catalog automatically once when admin connects to an empty database
  const seedCatalogToFirestore = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const batch = writeBatch(db);
      for (const srv of SEED_SERVICES) {
        const { id, ...rest } = srv;
        batch.set(doc(db, 'services', id), { ...rest, updatedAt: serverTimestamp() });
      }
      for (const art of SEED_ARTISTS) {
        const { id, ...rest } = art;
        batch.set(doc(db, 'artists', id), { ...rest, updatedAt: serverTimestamp() });
      }
      for (const ret of SEED_RETAIL) {
        const { id, ...rest } = ret;
        batch.set(doc(db, 'retailProducts', id), { ...rest, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'services');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (
      authReady &&
      isAdmin &&
      remoteServices !== null &&
      remoteServices.length === 0 &&
      !seededOnceRef.current
    ) {
      seededOnceRef.current = true;
      seedCatalogToFirestore().catch(() => {
        seededOnceRef.current = false;
      });
    }
  }, [authReady, isAdmin, remoteServices, seedCatalogToFirestore]);

  // Blog posts real-time listener (public sees published; admin sees published + drafts)
  useEffect(() => {
    const blogQuery =
      authReady && isAdmin
        ? collection(db, 'blogPosts')
        : query(collection(db, 'blogPosts'), where('published', '==', true));

    const toMs = (ts: unknown): number => {
      if (!ts) return 0;
      const obj = ts as { toMillis?: () => number; seconds?: number };
      if (typeof obj.toMillis === 'function') return obj.toMillis();
      if (typeof obj.seconds === 'number') return obj.seconds * 1000;
      return 0;
    };

    const unsubBlogs = onSnapshot(
      blogQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BlogPost, 'id'>),
        }));
        list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setRemoteBlogs(list);
      },
      (err) => {
        console.warn('Blog posts listener notice:', err.message);
        setRemoteBlogs((prev) => prev ?? []);
      },
    );

    return () => unsubBlogs();
  }, [authReady, isAdmin]);

  const adminSeedStarterBlogs = useCallback(async () => {
    const activeUser = user ?? auth.currentUser;
    if (!activeUser || !isAdmin) throw new Error('Studio owner sign-in required.');
    try {
      const batch = writeBatch(db);
      for (const post of SEED_BLOGS) {
        const { id, ...rest } = post;
        batch.set(doc(db, 'blogPosts', id), {
          ...rest,
          authorId: activeUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setBlogsCleared(false);
      try {
        window.localStorage.removeItem('ltn_blogs_cleared_v1');
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'blogPosts');
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (
      authReady &&
      isAdmin &&
      remoteBlogs !== null &&
      remoteBlogs.length === 0 &&
      !blogsCleared &&
      !seededBlogsOnceRef.current
    ) {
      seededBlogsOnceRef.current = true;
      adminSeedStarterBlogs().catch(() => {
        seededBlogsOnceRef.current = false;
      });
    }
  }, [authReady, isAdmin, remoteBlogs, blogsCleared, adminSeedStarterBlogs]);

  // Authenticated listeners: user profile, appointments, retailOrders, and admin POS ledger
  useEffect(() => {
    if (!authReady || !user) {
      setProfile(null);
      setAppointments([]);
      setEmailLogs([]);
      setRetailOrders([]);
      setPosTransactions([]);
      setLoyaltyCard(null);
      setAllLoyaltyCards([]);
      return;
    }

    const profileRef = doc(db, 'users', user.uid, 'private', 'profile');
    const unsubProfile = onSnapshot(
      profileRef,
      async (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserPrivateProfile);
        } else if (user.emailVerified) {
          // Initialize private client profile cleanly
          const initialProfile = {
            uid: user.uid,
            displayName: clampStr(user.displayName || 'Studio Guest', 100),
            email: clampStr(user.email || 'guest@example.com', 160),
            phone: '',
            preferredShape: 'Almond' as NailShape,
            preferredShade: 'Dusty Rose',
            allergiesOrNotes: '',
            loyaltyPoints: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(profileRef, initialProfile);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/private/profile`);
          }
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/private/profile`);
      },
    );

    const apptQuery = isAdmin
      ? query(collection(db, 'appointments'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'appointments'), where('clientId', '==', user.uid));

    const unsubAppts = onSnapshot(
      apptQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Appointment, 'id'>),
        }));
        list.sort((a, b) => `${b.date} ${b.timeSlot}`.localeCompare(`${a.date} ${a.timeSlot}`));
        setAppointments(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'appointments');
      },
    );

    const orderQuery = isAdmin
      ? query(collection(db, 'retailOrders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'retailOrders'), where('clientId', '==', user.uid));

    const unsubOrders = onSnapshot(
      orderQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<RetailOrder, 'id'>),
        }));
        setRetailOrders(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'retailOrders');
      },
    );

    let unsubPos = () => {};
    if (isAdmin) {
      unsubPos = onSnapshot(
        query(collection(db, 'posTransactions'), orderBy('createdAt', 'desc')),
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PosTransaction, 'id'>),
          }));
          setPosTransactions(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'posTransactions');
        },
      );
    } else {
      setPosTransactions([]);
    }

    const emailLogQuery = isAdmin
      ? query(collection(db, 'emailLogs'), orderBy('updatedAt', 'desc'))
      : query(collection(db, 'emailLogs'), where('clientId', '==', user.uid));

    const unsubEmailLogs = onSnapshot(
      emailLogQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmailLog, 'id'>),
        }));
        setEmailLogs(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'emailLogs');
      },
    );

    const clientEmailKey = (user.email || '').trim().toLowerCase();
    const loyaltyQuery = clientEmailKey
      ? query(collection(db, 'loyaltyCards'), where('clientEmail', '==', clientEmailKey))
      : query(collection(db, 'loyaltyCards'), where('uid', '==', user.uid));

    const unsubLoyalty = onSnapshot(
      loyaltyQuery,
      async (snap) => {
        if (!snap.empty) {
          const cards = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyCard, 'id'>) }))
            .sort((a, b) => (b.stamps || 0) - (a.stamps || 0));
          setLoyaltyCard(cards[0]);
        } else if (loyaltyEnabledRef.current && user.emailVerified && user.email) {
          const fallbackRef = doc(db, 'loyaltyCards', user.uid);
          const initialCard = {
            uid: user.uid,
            clientName: clampStr(user.displayName || 'Studio Guest', 100),
            clientEmail: clampStr(user.email.trim().toLowerCase(), 160),
            cardCode: generateCode('VIP'),
            stamps: 0,
            totalVisits: 0,
            rewardsRedeemed: 0,
            rewardNote: '10th visit unlocks a Complimentary Signature Set',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(fallbackRef, initialCard);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `loyaltyCards/${user.uid}`);
          }
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `loyaltyCards/${user.uid}`);
      },
    );

    let unsubAllLoyalty = () => {};
    if (isAdmin) {
      unsubAllLoyalty = onSnapshot(
        query(collection(db, 'loyaltyCards'), orderBy('updatedAt', 'desc')),
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LoyaltyCard, 'id'>),
          }));
          setAllLoyaltyCards(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'loyaltyCards');
        },
      );
    } else {
      setAllLoyaltyCards([]);
    }

    return () => {
      unsubProfile();
      unsubAppts();
      unsubOrders();
      unsubPos();
      unsubEmailLogs();
      unsubLoyalty();
      unsubAllLoyalty();
    };
  }, [authReady, user, isAdmin]);

  const services = useMemo(
    () => (remoteServices && remoteServices.length > 0 ? remoteServices : SEED_SERVICES),
    [remoteServices],
  );

  const artists = useMemo(
    () => (remoteArtists && remoteArtists.length > 0 ? remoteArtists : SEED_ARTISTS),
    [remoteArtists],
  );

  const retailProducts = useMemo(
    () => (remoteRetail && remoteRetail.length > 0 ? remoteRetail : SEED_RETAIL),
    [remoteRetail],
  );

  const blogPosts = useMemo(() => {
    if (remoteBlogs && remoteBlogs.length > 0) return remoteBlogs;
    if (remoteBlogs !== null && remoteBlogs.length === 0 && blogsCleared) return [];
    return isAdmin ? SEED_BLOGS : SEED_BLOGS.filter((b) => b.published);
  }, [remoteBlogs, blogsCleared, isAdmin]);

  const catalogSynced = Boolean(remoteServices && remoteServices.length > 0);

  const addToCart = useCallback((product: RetailProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, Math.max(1, product.stock)) }
            : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsBagOpen(true);
  }, []);

  const updateCartQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        throw new Error('Google sign-in popup was blocked. Please allow popups for this site and try again.');
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('Google sign-in was cancelled before completing.');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized in Firebase Authentication settings yet.');
      }
      throw err;
    }
  }, []);

  const signInAdminWithGoogle = useCallback(async () => {
    isGmailAuthInFlightRef.current = true;
    try {
      const result = await signInWithPopup(auth, adminGoogleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;
      const isBootstrapEmail =
        Boolean(result.user?.emailVerified) &&
        result.user?.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      let authorizedAdmin = isBootstrapEmail;
      if (!authorizedAdmin && result.user?.emailVerified) {
        try {
          const snap = await getDoc(doc(db, 'admins', result.user.uid));
          authorizedAdmin = snap.exists();
        } catch {
          authorizedAdmin = false;
        }
      }
      if (authorizedAdmin && token) {
        cachedGmailAccessToken = token;
        setGmailConnected(true);
      } else {
        cachedGmailAccessToken = null;
        setGmailConnected(false);
      }
      return result.user;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        throw new Error('Google sign-in popup was blocked. Please allow popups for this site and try again.');
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('Google sign-in was cancelled before completing.');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized in Firebase Authentication settings yet.');
      }
      throw err;
    } finally {
      isGmailAuthInFlightRef.current = false;
    }
  }, []);

  const connectAdminGmail = useCallback(async (): Promise<string> => {
    const signedUser = await signInAdminWithGoogle();
    if (!signedUser || !signedUser.emailVerified) {
      throw new Error('Verified Google admin sign-in is required to connect Gmail.');
    }
    const isBootstrapEmail =
      signedUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    let authorizedAdmin = isBootstrapEmail;
    if (!authorizedAdmin) {
      try {
        const snap = await getDoc(doc(db, 'admins', signedUser.uid));
        authorizedAdmin = snap.exists();
      } catch {
        authorizedAdmin = false;
      }
    }
    if (!authorizedAdmin) {
      throw new Error(
        `Please sign in with the authorized studio admin account (${BOOTSTRAP_ADMIN_EMAIL}) to send emails.`,
      );
    }
    if (!cachedGmailAccessToken) {
      throw new Error(
        'Gmail send permission was not granted. Please allow the "Send email on your behalf" permission when signing in.',
      );
    }
    return cachedGmailAccessToken;
  }, [signInAdminWithGoogle]);

  const signOutUser = useCallback(async () => {
    cachedGmailAccessToken = null;
    setGmailConnected(false);
    await signOut(auth);
  }, []);

  const saveClientProfile = useCallback(
    async (
      data: Pick<
        UserPrivateProfile,
        'displayName' | 'phone' | 'preferredShape' | 'preferredShade' | 'allergiesOrNotes'
      >,
    ) => {
      if (!user) throw new Error('Sign in required to save studio preferences.');
      const path = `users/${user.uid}/private/profile`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'private', 'profile'), {
          displayName: clampStr(data.displayName || 'Studio Client', 100),
          phone: clampStr(data.phone, 32),
          preferredShape: data.preferredShape,
          preferredShade: clampStr(data.preferredShade, 60),
          allergiesOrNotes: clampStr(data.allergiesOrNotes, 400),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const createAppointment = useCallback(
    async (input: CreateAppointmentInput): Promise<Appointment> => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser) throw new Error('Please sign in with Google to confirm your appointment.');
      const activeIsAdmin = Boolean(
        activeUser.emailVerified &&
          (activeUser.email === BOOTSTRAP_ADMIN_EMAIL || isAdmin),
      );
      // Ensure services and artists exist in Firestore when booking if catalog isn't seeded yet and user is admin
      const appointmentId = generateId('appt');
      const bookingCode = generateCode('LTN');
      const addonTotal = input.addons.reduce((sum, a) => sum + a.price, 0);
      const addonMins = input.addons.reduce((sum, a) => sum + a.durationMin, 0);
      const totalPrice = Math.min(5000, Math.max(0, input.service.price + addonTotal));
      const durationMin = Math.min(300, Math.max(15, input.service.durationMin + addonMins));

      const apptPayload = {
        bookingCode,
        clientId: activeUser.uid,
        clientName: clampStr(input.clientName || activeUser.displayName || 'Studio Guest', 100),
        clientEmail: clampStr(activeUser.email || 'client@lovethosenails.studio', 160),
        clientPhone: clampStr(input.clientPhone || '000-000-0000', 32),
        serviceId: input.service.id,
        serviceName: clampStr(input.service.name, 120),
        artistId: input.artist.id,
        artistName: clampStr(input.artist.name, 80),
        date: input.date,
        timeSlot: clampStr(input.timeSlot, 12),
        durationMin,
        totalPrice,
        nailShape: input.nailShape,
        shadePreference: clampStr(input.shadePreference || 'Dusty Rose', 60),
        addons: input.addons.slice(0, 8).map((a) => clampStr(a.label, 60)),
        notes: clampStr(input.notes, 500),
        status: (input.isWalkInByAdmin && activeIsAdmin ? 'confirmed' : 'pending') as AppointmentStatus,
        paymentStatus: 'unpaid' as PaymentStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const slotPayload = {
        appointmentId,
        artistId: input.artist.id,
        date: input.date,
        timeSlot: clampStr(input.timeSlot, 12),
        durationMin,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        // Ensure catalog documents exist in Firestore prior to appointment rule exists() checks
        if (!catalogSynced && activeIsAdmin) {
          const seedBatch = writeBatch(db);
          for (const srv of SEED_SERVICES) {
            const { id, ...rest } = srv;
            seedBatch.set(doc(db, 'services', id), { ...rest, updatedAt: serverTimestamp() });
          }
          for (const art of SEED_ARTISTS) {
            const { id, ...rest } = art;
            seedBatch.set(doc(db, 'artists', id), { ...rest, updatedAt: serverTimestamp() });
          }
          for (const ret of SEED_RETAIL) {
            const { id, ...rest } = ret;
            seedBatch.set(doc(db, 'retailProducts', id), { ...rest, updatedAt: serverTimestamp() });
          }
          await seedBatch.commit();
        }

        const batch = writeBatch(db);
        batch.set(doc(db, 'appointments', appointmentId), apptPayload);
        batch.set(doc(db, 'bookedSlots', appointmentId), slotPayload);
        await batch.commit();
        return { id: appointmentId, ...apptPayload };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `appointments/${appointmentId}`);
      }
    },
    [user, isAdmin, catalogSynced],
  );

  const cancelAppointment = useCallback(async (appointmentId: string) => {
    try {
      const slotRef = doc(db, 'bookedSlots', appointmentId);
      const slotSnap = await getDoc(slotRef);
      const batch = writeBatch(db);
      batch.update(doc(db, 'appointments', appointmentId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      if (slotSnap.exists()) {
        batch.update(slotRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${appointmentId}`);
    }
  }, []);

  const adminUpdateAppointment = useCallback(
    async (
      appointmentId: string,
      updates: Partial<Pick<Appointment, 'status' | 'paymentStatus' | 'notes' | 'date' | 'timeSlot'>>,
    ) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      try {
        const slotRef = doc(db, 'bookedSlots', appointmentId);
        const slotSnap = await getDoc(slotRef);
        const batch = writeBatch(db);
        const sanitized: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };
        if (updates.status !== undefined) sanitized.status = updates.status;
        if (updates.paymentStatus !== undefined) sanitized.paymentStatus = updates.paymentStatus;
        if (updates.notes !== undefined) sanitized.notes = clampStr(updates.notes, 500);
        if (updates.date !== undefined) sanitized.date = updates.date;
        if (updates.timeSlot !== undefined) sanitized.timeSlot = clampStr(updates.timeSlot, 12);

        batch.update(doc(db, 'appointments', appointmentId), sanitized);

        if (slotSnap.exists()) {
          if (updates.status === 'cancelled') {
            batch.update(slotRef, {
              status: 'cancelled',
              updatedAt: serverTimestamp(),
            });
          } else if (updates.date || updates.timeSlot || updates.status === 'confirmed') {
            const slotUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
            if (updates.date) slotUpdates.date = updates.date;
            if (updates.timeSlot) slotUpdates.timeSlot = clampStr(updates.timeSlot, 12);
            if (updates.status === 'confirmed') slotUpdates.status = 'active';
            batch.update(slotRef, slotUpdates);
          }
        }

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${appointmentId}`);
      }
    },
    [isAdmin],
  );

  const adminConfirmOrCancelWithEmail = useCallback(
    async (
      appointment: Appointment,
      nextStatus: BookingEmailType,
    ): Promise<{ emailSent: boolean; messageId: string }> => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');

      let token = cachedGmailAccessToken;
      if (!token) {
        token = await connectAdminGmail();
      }

      let sendResult: { messageId: string };
      try {
        sendResult = await sendStudioBookingEmail({
          accessToken: token,
          type: nextStatus,
          appointment,
        });
      } catch (err) {
        if (err instanceof GmailAuthExpiredError) {
          cachedGmailAccessToken = null;
          setGmailConnected(false);
          const refreshedToken = await connectAdminGmail();
          sendResult = await sendStudioBookingEmail({
            accessToken: refreshedToken,
            type: nextStatus,
            appointment,
          });
        } else {
          throw err;
        }
      }

      try {
        const emailLogRef = doc(db, 'emailLogs', appointment.id);
        const existingLogSnap = await getDoc(emailLogRef);
        const existingLogData = existingLogSnap.exists() ? existingLogSnap.data() : null;

        const batch = writeBatch(db);
        if (appointment.status !== nextStatus) {
          batch.update(doc(db, 'appointments', appointment.id), {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });
          batch.update(doc(db, 'bookedSlots', appointment.id), {
            status: nextStatus === 'cancelled' ? 'cancelled' : 'active',
            updatedAt: serverTimestamp(),
          });
        }

        const logPayload: Record<string, unknown> = {
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          clientEmail: clampStr(appointment.clientEmail, 160),
          bookingCode: appointment.bookingCode,
          date: appointment.date,
          timeSlot: clampStr(appointment.timeSlot, 12),
          lastStatusNotified: nextStatus,
          lastError: null,
          updatedAt: serverTimestamp(),
        };
        if (nextStatus === 'confirmed') {
          logPayload.confirmationSentAt = serverTimestamp();
        } else if (existingLogData?.confirmationSentAt) {
          logPayload.confirmationSentAt = existingLogData.confirmationSentAt;
        }
        if (existingLogData?.dayBeforeReminderSentAt) {
          logPayload.dayBeforeReminderSentAt = existingLogData.dayBeforeReminderSentAt;
        }
        if (existingLogData?.oneHourReminderSentAt) {
          logPayload.oneHourReminderSentAt = existingLogData.oneHourReminderSentAt;
        }

        batch.set(emailLogRef, logPayload);
        await batch.commit();
        return { emailSent: true, messageId: sendResult.messageId };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `appointments/${appointment.id}`);
      }
    },
    [isAdmin, connectAdminGmail],
  );

  const adminRecordPosCheckout = useCallback(
    async (payload: {
      appointment?: Appointment;
      clientName: string;
      summary: string;
      subtotal: number;
      tip: number;
      paymentMethod: PaymentMethod;
    }): Promise<PosTransaction> => {
      if (!user || !isAdmin) throw new Error('Studio admin privileges required.');
      const txId = generateId('pos');
      const txCode = generateCode('POS');
      const subtotal = Math.max(0, Math.round(payload.subtotal * 100) / 100);
      const tip = Math.max(0, Math.round(payload.tip * 100) / 100);
      const total = Math.round((subtotal + tip) * 100) / 100;

      const txData = {
        txCode,
        appointmentId: payload.appointment?.id || 'walkin',
        clientName: clampStr(payload.clientName || 'Walk-in Client', 100),
        summary: clampStr(payload.summary, 200),
        subtotal,
        tip,
        total,
        paymentMethod: payload.paymentMethod,
        recordedBy: user.uid,
        createdAt: serverTimestamp(),
      };

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'posTransactions', txId), txData);
        if (payload.appointment) {
          batch.update(doc(db, 'appointments', payload.appointment.id), {
            status: 'completed',
            paymentStatus: 'paid',
            updatedAt: serverTimestamp(),
          });
          // Award loyalty points if the client profile document exists
          const clientProfRef = doc(db, 'users', payload.appointment.clientId, 'private', 'profile');
          const clientProfSnap = await getDoc(clientProfRef);
          if (clientProfSnap.exists()) {
            const currentPts = Number(clientProfSnap.data().loyaltyPoints || 0);
            const earned = Math.max(10, Math.round(subtotal));
            batch.update(clientProfRef, {
              loyaltyPoints: currentPts + earned,
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
        return { id: txId, ...txData };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `posTransactions/${txId}`);
      }
    },
    [user, isAdmin],
  );

  const createRetailOrder = useCallback(
    async (pickupDate: string, clientName: string): Promise<RetailOrder> => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser) throw new Error('Sign in with Google to reserve retail items.');
      if (cart.length === 0) throw new Error('Your studio care bag is empty.');

      const orderId = generateId('ord');
      const orderCode = generateCode('ORD');
      const itemNames = cart
        .slice(0, 15)
        .map((c) => clampStr(`${c.quantity}x ${c.product.name}`, 80));
      const totalAmount = Math.round(
        cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0) * 100,
      ) / 100;

      const orderData = {
        orderCode,
        clientId: activeUser.uid,
        clientName: clampStr(clientName || activeUser.displayName || 'Studio Client', 100),
        itemNames,
        totalAmount,
        pickupDate,
        status: 'reserved' as RetailOrderStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'retailOrders', orderId), orderData);
        clearCart();
        return { id: orderId, ...orderData };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `retailOrders/${orderId}`);
      }
    },
    [user, cart, clearCart],
  );

  const adminUpdateRetailOrderStatus = useCallback(
    async (orderId: string, status: RetailOrderStatus) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      try {
        await updateDoc(doc(db, 'retailOrders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `retailOrders/${orderId}`);
      }
    },
    [isAdmin],
  );

  const adminUpsertService = useCallback(
    async (service: Omit<ServiceItem, 'updatedAt'>) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      const { id, ...rest } = service;
      try {
        await setDoc(doc(db, 'services', id), {
          name: clampStr(rest.name, 100),
          category: rest.category,
          description: clampStr(rest.description, 400),
          durationMin: Math.min(300, Math.max(10, Number(rest.durationMin))),
          price: Math.min(2000, Math.max(0, Number(rest.price))),
          featured: Boolean(rest.featured),
          active: Boolean(rest.active),
          sortOrder: Math.min(1000, Math.max(0, Number(rest.sortOrder))),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `services/${id}`);
      }
    },
    [isAdmin],
  );

  const adminDeleteService = useCallback(
    async (serviceId: string) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      try {
        if (!remoteServices || remoteServices.length === 0) {
          const batch = writeBatch(db);
          for (const srv of SEED_SERVICES) {
            if (srv.id === serviceId) continue;
            const { id, ...rest } = srv;
            batch.set(doc(db, 'services', id), { ...rest, updatedAt: serverTimestamp() });
          }
          if (!remoteArtists || remoteArtists.length === 0) {
            for (const art of SEED_ARTISTS) {
              const { id, ...rest } = art;
              batch.set(doc(db, 'artists', id), { ...rest, updatedAt: serverTimestamp() });
            }
          }
          await batch.commit();
          return;
        }
        await deleteDoc(doc(db, 'services', serviceId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `services/${serviceId}`);
      }
    },
    [isAdmin, remoteServices, remoteArtists],
  );

  const adminUpsertArtist = useCallback(
    async (artist: Omit<ArtistItem, 'updatedAt'>) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      const { id, ...rest } = artist;
      try {
        await setDoc(doc(db, 'artists', id), {
          name: clampStr(rest.name, 80),
          role: clampStr(rest.role, 80),
          specialty: clampStr(rest.specialty, 140),
          bio: clampStr(rest.bio, 400),
          workDays: rest.workDays.slice(0, 7),
          active: Boolean(rest.active),
          accentTone: clampStr(rest.accentTone || '#D2AAAB', 20),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `artists/${id}`);
      }
    },
    [isAdmin],
  );

  const adminDeleteArtist = useCallback(
    async (artistId: string) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      try {
        await deleteDoc(doc(db, 'artists', artistId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `artists/${artistId}`);
      }
    },
    [isAdmin],
  );

  const adminUpsertRetailProduct = useCallback(
    async (product: Omit<RetailProduct, 'updatedAt'>) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      const { id, ...rest } = product;
      try {
        await setDoc(doc(db, 'retailProducts', id), {
          name: clampStr(rest.name, 100),
          category: rest.category,
          description: clampStr(rest.description, 350),
          price: Math.min(1000, Math.max(0, Number(rest.price))),
          stock: Math.min(10000, Math.max(0, Number(rest.stock))),
          shadeHex: clampStr(rest.shadeHex || '#D2AAAB', 20),
          active: Boolean(rest.active),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `retailProducts/${id}`);
      }
    },
    [isAdmin],
  );

  const adminDeleteRetailProduct = useCallback(
    async (productId: string) => {
      if (!isAdmin) throw new Error('Studio admin privileges required.');
      try {
        if (!remoteRetail || remoteRetail.length === 0) {
          const batch = writeBatch(db);
          for (const ret of SEED_RETAIL) {
            if (ret.id === productId) continue;
            const { id, ...rest } = ret;
            batch.set(doc(db, 'retailProducts', id), { ...rest, updatedAt: serverTimestamp() });
          }
          await batch.commit();
          return;
        }
        await deleteDoc(doc(db, 'retailProducts', productId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `retailProducts/${productId}`);
      }
    },
    [isAdmin, remoteRetail],
  );

  const adminCreateGalleryPost = useCallback(
    async (post: {
      title: string;
      caption: string;
      imageUrl: string;
      category: GalleryCategory;
      nailShape: NailShape;
      shadeName: string;
      artistName: string;
      featured: boolean;
    }): Promise<GalleryPost> => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser || !isAdmin) throw new Error('Studio owner sign-in is required to post works.');
      const postId = generateId('gal');
      const imageUrl = post.imageUrl.trim().slice(0, 350000);
      if (imageUrl.length < 10) {
        throw new Error('Please upload a nail photo or provide a valid image URL.');
      }

      const payload = {
        title: clampStr(post.title, 100),
        caption: clampStr(post.caption, 500),
        imageUrl,
        category: post.category,
        nailShape: post.nailShape,
        shadeName: clampStr(post.shadeName, 60),
        artistName: clampStr(post.artistName || 'Eshin', 80),
        featured: Boolean(post.featured),
        authorId: activeUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'galleryPosts', postId), payload);
        return { id: postId, ...payload };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `galleryPosts/${postId}`);
      }
    },
    [user, isAdmin],
  );

  const adminUpdateGalleryPost = useCallback(
    async (
      postId: string,
      updates: {
        title: string;
        caption: string;
        imageUrl: string;
        category: GalleryCategory;
        nailShape: NailShape;
        shadeName: string;
        artistName: string;
        featured: boolean;
      },
    ) => {
      if (!isAdmin) throw new Error('Studio owner sign-in is required to edit posts.');
      const imageUrl = updates.imageUrl.trim().slice(0, 350000);
      if (imageUrl.length < 10) {
        throw new Error('Please upload a nail photo or provide a valid image URL.');
      }
      try {
        await updateDoc(doc(db, 'galleryPosts', postId), {
          title: clampStr(updates.title, 100),
          caption: clampStr(updates.caption, 500),
          imageUrl,
          category: updates.category,
          nailShape: updates.nailShape,
          shadeName: clampStr(updates.shadeName, 60),
          artistName: clampStr(updates.artistName || 'Eshin', 80),
          featured: Boolean(updates.featured),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `galleryPosts/${postId}`);
      }
    },
    [isAdmin],
  );

  const adminDeleteGalleryPost = useCallback(
    async (postId: string) => {
      if (!isAdmin) throw new Error('Studio owner sign-in is required to delete posts.');
      try {
        await deleteDoc(doc(db, 'galleryPosts', postId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `galleryPosts/${postId}`);
      }
    },
    [isAdmin],
  );

  const adminCreateBlogPost = useCallback(
    async (post: {
      title: string;
      category: BlogCategory;
      excerpt: string;
      content: string;
      coverImageUrl: string;
      authorName: string;
      readTimeMin: number;
      featured: boolean;
      published: boolean;
    }): Promise<BlogPost> => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser || !isAdmin) throw new Error('Studio owner sign-in is required to publish blog articles.');
      const postId = generateId('blog');
      const title = clampStr(post.title, 120);
      const excerpt = clampStr(post.excerpt, 320);
      const content = post.content.trim().slice(0, 8000);
      const coverImageUrl = post.coverImageUrl.trim().slice(0, 350000);
      if (title.length < 2) throw new Error('Blog title must be at least 2 characters.');
      if (excerpt.length < 10) throw new Error('Summary / excerpt must be at least 10 characters.');
      if (content.length < 20) throw new Error('Article body must be at least 20 characters.');

      const payload = {
        title,
        category: post.category,
        excerpt,
        content,
        coverImageUrl,
        authorName: clampStr(post.authorName || 'Eshin', 80),
        readTimeMin: Math.min(60, Math.max(1, Math.round(Number(post.readTimeMin) || 3))),
        featured: Boolean(post.featured),
        published: Boolean(post.published),
        authorId: activeUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'blogPosts', postId), payload);
        setBlogsCleared(false);
        try {
          window.localStorage.removeItem('ltn_blogs_cleared_v1');
        } catch {
          // Ignore storage errors
        }
        return { id: postId, ...payload };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `blogPosts/${postId}`);
      }
    },
    [user, isAdmin],
  );

  const adminUpdateBlogPost = useCallback(
    async (
      postId: string,
      updates: {
        title: string;
        category: BlogCategory;
        excerpt: string;
        content: string;
        coverImageUrl: string;
        authorName: string;
        readTimeMin: number;
        featured: boolean;
        published: boolean;
      },
    ) => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser || !isAdmin) throw new Error('Studio owner sign-in is required to edit blog articles.');
      const title = clampStr(updates.title, 120);
      const excerpt = clampStr(updates.excerpt, 320);
      const content = updates.content.trim().slice(0, 8000);
      const coverImageUrl = updates.coverImageUrl.trim().slice(0, 350000);
      if (title.length < 2) throw new Error('Blog title must be at least 2 characters.');
      if (excerpt.length < 10) throw new Error('Summary / excerpt must be at least 10 characters.');
      if (content.length < 20) throw new Error('Article body must be at least 20 characters.');

      const cleanFields = {
        title,
        category: updates.category,
        excerpt,
        content,
        coverImageUrl,
        authorName: clampStr(updates.authorName || 'Eshin', 80),
        readTimeMin: Math.min(60, Math.max(1, Math.round(Number(updates.readTimeMin) || 3))),
        featured: Boolean(updates.featured),
        published: Boolean(updates.published),
        updatedAt: serverTimestamp(),
      };

      try {
        const ref = doc(db, 'blogPosts', postId);
        const existingSnap = await getDoc(ref);
        if (existingSnap.exists()) {
          await updateDoc(ref, cleanFields);
        } else {
          // Starter blog not yet written to Firestore: seed it cleanly along with any remaining starters
          const batch = writeBatch(db);
          batch.set(ref, {
            ...cleanFields,
            authorId: activeUser.uid,
            createdAt: serverTimestamp(),
          });
          if (!remoteBlogs || remoteBlogs.length === 0) {
            for (const seed of SEED_BLOGS) {
              if (seed.id === postId) continue;
              const { id, ...rest } = seed;
              batch.set(doc(db, 'blogPosts', id), {
                ...rest,
                authorId: activeUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          }
          await batch.commit();
        }
        setBlogsCleared(false);
        try {
          window.localStorage.removeItem('ltn_blogs_cleared_v1');
        } catch {
          // Ignore storage errors
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `blogPosts/${postId}`);
      }
    },
    [user, isAdmin, remoteBlogs],
  );

  const adminDeleteBlogPost = useCallback(
    async (postId: string) => {
      const activeUser = user ?? auth.currentUser;
      if (!activeUser || !isAdmin) throw new Error('Studio owner sign-in is required to delete blog articles.');
      try {
        if (!remoteBlogs || remoteBlogs.length === 0) {
          const remaining = SEED_BLOGS.filter((b) => b.id !== postId);
          if (remaining.length > 0) {
            const batch = writeBatch(db);
            for (const seed of remaining) {
              const { id, ...rest } = seed;
              batch.set(doc(db, 'blogPosts', id), {
                ...rest,
                authorId: activeUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await batch.commit();
            return;
          }
        }
        const willBeEmpty = Boolean(remoteBlogs && remoteBlogs.length <= 1);
        await deleteDoc(doc(db, 'blogPosts', postId));
        if (willBeEmpty) {
          setBlogsCleared(true);
          try {
            window.localStorage.setItem('ltn_blogs_cleared_v1', '1');
          } catch {
            // Ignore storage errors
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `blogPosts/${postId}`);
      }
    },
    [user, isAdmin, remoteBlogs],
  );

  const adminGrantLoyaltyStamp = useCallback(
    async (cardId: string, delta = 1) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      const cardRef = doc(db, 'loyaltyCards', cardId);
      try {
        const snap = await getDoc(cardRef);
        if (!snap.exists()) {
          throw new Error('Loyalty card record not found.');
        }
        const current = snap.data() as Omit<LoyaltyCard, 'id'>;
        const nextStamps = Math.min(10, Math.max(0, Number(current.stamps || 0) + delta));
        const nextVisits =
          delta > 0
            ? Math.min(10000, Number(current.totalVisits || 0) + 1)
            : Math.max(0, Number(current.totalVisits || 0));
        await updateDoc(cardRef, {
          stamps: nextStamps,
          totalVisits: nextVisits,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `loyaltyCards/${cardId}`);
      }
    },
    [isAdmin],
  );

  const adminCreateOrStampByEmail = useCallback(
    async (payload: {
      email: string;
      clientName?: string;
      initialStamps?: number;
    }): Promise<{ created: boolean; cardCode: string; stamps: number; clientEmail: string }> => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      const normalizedEmail = clampStr(payload.email.trim().toLowerCase(), 160);
      if (!normalizedEmail || !normalizedEmail.includes('@') || normalizedEmail.length < 5) {
        throw new Error('Please enter a valid client email address.');
      }

      const existing = allLoyaltyCards.find(
        (c) => c.clientEmail.trim().toLowerCase() === normalizedEmail,
      );

      if (existing) {
        const nextStamps = Math.min(10, Math.max(0, Number(existing.stamps || 0) + 1));
        const nextVisits = Math.min(10000, Number(existing.totalVisits || 0) + 1);
        try {
          await updateDoc(doc(db, 'loyaltyCards', existing.id), {
            stamps: nextStamps,
            totalVisits: nextVisits,
            updatedAt: serverTimestamp(),
          });
          return {
            created: false,
            cardCode: existing.cardCode,
            stamps: nextStamps,
            clientEmail: existing.clientEmail,
          };
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `loyaltyCards/${existing.id}`);
        }
      }

      const cardId = generateId('card');
      const cardCode = generateCode('VIP');
      const stampsToAdd = Math.min(10, Math.max(0, payload.initialStamps ?? 1));
      const fallbackName = normalizedEmail.split('@')[0] || 'Studio Client';
      const clientName = clampStr(payload.clientName?.trim() || fallbackName, 100);

      try {
        await setDoc(doc(db, 'loyaltyCards', cardId), {
          uid: 'pending',
          clientName,
          clientEmail: normalizedEmail,
          cardCode,
          stamps: stampsToAdd,
          totalVisits: stampsToAdd > 0 ? 1 : 0,
          rewardsRedeemed: 0,
          rewardNote: '10th visit unlocks a Complimentary Signature Set',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          created: true,
          cardCode,
          stamps: stampsToAdd,
          clientEmail: normalizedEmail,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `loyaltyCards/${cardId}`);
      }
    },
    [isAdmin, allLoyaltyCards],
  );

  const adminRedeemLoyaltyReward = useCallback(
    async (cardId: string) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      const cardRef = doc(db, 'loyaltyCards', cardId);
      try {
        const snap = await getDoc(cardRef);
        if (!snap.exists()) return;
        const current = snap.data() as Omit<LoyaltyCard, 'id'>;
        await updateDoc(cardRef, {
          stamps: 0,
          rewardsRedeemed: Math.min(1000, Number(current.rewardsRedeemed || 0) + 1),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `loyaltyCards/${cardId}`);
      }
    },
    [isAdmin],
  );

  const adminSetLoyaltyEnabled = useCallback(
    async (enabled: boolean) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      try {
        await setDoc(doc(db, 'studioSettings', 'studio'), {
          loyaltyEnabled: Boolean(enabled),
          careShopEnabled: Boolean(careShopEnabledRef.current),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'studioSettings/studio');
      }
    },
    [isAdmin],
  );

  const adminSetCareShopEnabled = useCallback(
    async (enabled: boolean) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      try {
        await setDoc(doc(db, 'studioSettings', 'studio'), {
          loyaltyEnabled: Boolean(loyaltyEnabledRef.current),
          careShopEnabled: Boolean(enabled),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'studioSettings/studio');
      }
    },
    [isAdmin],
  );

  const adminUpdateStudioSchedule = useCallback(
    async (next: {
      openWeekdays: number[];
      timeSlots: string[];
      weekdaySlots?: Record<string, string[]>;
    }) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      const sanitizedWeekdays = Array.from(
        new Set(next.openWeekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
      ).sort((a, b) => a - b);
      const sanitizedSlots = sortTimeSlots(
        next.timeSlots.map((s) => clampStr(s, 12)).filter((s) => s.length >= 4),
      ).slice(0, 24);
      const sanitizedWeekdaySlots: Record<string, string[]> = {};
      for (let d = 0; d <= 6; d += 1) {
        const key = String(d);
        const rawList = next.weekdaySlots?.[key] ?? scheduleConfig.weekdaySlots?.[key] ?? sanitizedSlots;
        sanitizedWeekdaySlots[key] = sortTimeSlots(
          rawList.map((s) => clampStr(s, 12)).filter((s) => s.length >= 4),
        ).slice(0, 24);
      }
      try {
        await setDoc(doc(db, 'studioSettings', 'schedule'), {
          openWeekdays: sanitizedWeekdays,
          timeSlots: sanitizedSlots,
          weekdaySlots: sanitizedWeekdaySlots,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'studioSettings/schedule');
      }
    },
    [isAdmin, scheduleConfig.weekdaySlots],
  );

  const adminUpdateDaySchedule = useCallback(
    async (
      date: string,
      updates: {
        dayStatus?: DayOverrideStatus;
        blockedSlots?: string[];
        extraSlots?: string[];
      },
    ) => {
      if (!isAdmin) throw new Error('Studio owner privileges required.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format.');
      }
      const existingOverride = dayOverrides[date];
      const nextStatus: DayOverrideStatus =
        updates.dayStatus ?? existingOverride?.dayStatus ?? 'default';
      const nextBlocked = sortTimeSlots(
        (updates.blockedSlots ?? existingOverride?.blockedSlots ?? [])
          .map((s) => clampStr(s, 12))
          .filter((s) => s.length >= 4),
      ).slice(0, 24);
      const nextExtra = sortTimeSlots(
        (updates.extraSlots ?? existingOverride?.extraSlots ?? [])
          .map((s) => clampStr(s, 12))
          .filter((s) => s.length >= 4),
      ).slice(0, 24);

      const ref = doc(db, 'daySchedules', date);
      try {
        if (nextStatus === 'default' && nextBlocked.length === 0 && nextExtra.length === 0) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            date,
            dayStatus: nextStatus,
            blockedSlots: nextBlocked,
            extraSlots: nextExtra,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `daySchedules/${date}`);
      }
    },
    [isAdmin, dayOverrides],
  );

  const value: StudioContextValue = {
    user,
    authReady,
    isAdmin,
    gmailConnected,
    catalogSynced,
    services,
    artists,
    retailProducts,
    bookedSlots,
    appointments,
    emailLogs,
    retailOrders,
    posTransactions,
    galleryPosts,
    loyaltyCard,
    allLoyaltyCards,
    loyaltyEnabled,
    careShopEnabled,
    scheduleConfig,
    dayOverrides,
    adminSetLoyaltyEnabled,
    adminSetCareShopEnabled,
    adminUpdateStudioSchedule,
    adminUpdateDaySchedule,
    profile,
    cart,
    isBagOpen,
    setIsBagOpen,
    addToCart,
    updateCartQty,
    clearCart,
    signInWithGoogle,
    signInAdminWithGoogle,
    connectAdminGmail,
    signOutUser,
    saveClientProfile,
    createAppointment,
    cancelAppointment,
    adminUpdateAppointment,
    adminConfirmOrCancelWithEmail,
    adminRecordPosCheckout,
    createRetailOrder,
    adminUpdateRetailOrderStatus,
    adminUpsertService,
    adminDeleteService,
    adminUpsertArtist,
    adminDeleteArtist,
    adminUpsertRetailProduct,
    adminDeleteRetailProduct,
    adminCreateGalleryPost,
    adminUpdateGalleryPost,
    adminDeleteGalleryPost,
    blogPosts,
    adminCreateBlogPost,
    adminUpdateBlogPost,
    adminDeleteBlogPost,
    adminSeedStarterBlogs,
    adminGrantLoyaltyStamp,
    adminCreateOrStampByEmail,
    adminRedeemLoyaltyReward,
    seedCatalogToFirestore,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}
