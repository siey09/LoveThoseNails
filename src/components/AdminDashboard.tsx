import {
  ArrowLeft,
  Award,
  Calendar,
  CalendarCheck,
  Check,
  Gift,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  LogOut,
  Mail,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useStudio } from '../context/StudioContext';
import { NAIL_SHAPES } from '../data/seedCatalog';
import { buildBookingEmailPreview } from '../lib/gmail';
import { AdminCalendar } from './AdminCalendar';
import type {
  Appointment,
  AppointmentStatus,
  GalleryCategory,
  GalleryPost,
  NailShape,
  RetailCategory,
  ServiceCategory,
} from '../types/studio';

interface AdminDashboardProps {
  onBackToStudio: () => void;
  onOpenGallery: () => void;
  onOpenAdminLogin: () => void;
}

type AdminTab = 'appointments' | 'calendar' | 'gallery' | 'loyalty' | 'catalog';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Gel-X & Extensions',
  'BIAB & Builder',
  'Signature Nail Art',
  'Manicure & Spa',
  'Add-Ons & Removal',
];

const RETAIL_CATEGORIES: RetailCategory[] = [
  'Cuticle Care',
  'Hand Ritual',
  'Tools & Prep',
  'Press-On Sets',
];

const MAX_DATA_URL_LENGTH = 260_000;

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        let maxDim = 1080;
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
            reject(new Error('Photo is still too large after compression. Please choose a smaller image.'));
            return;
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to process image.'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard({
  onBackToStudio,
  onOpenGallery,
  onOpenAdminLogin,
}: AdminDashboardProps) {
  const {
    user,
    isAdmin,
    gmailConnected,
    catalogSynced,
    services,
    retailProducts,
    bookedSlots,
    appointments,
    emailLogs,
    galleryPosts,
    allLoyaltyCards,
    connectAdminGmail,
    signOutUser,
    adminUpdateAppointment,
    adminConfirmOrCancelWithEmail,
    adminUpsertService,
    adminDeleteService,
    adminUpsertRetailProduct,
    adminDeleteRetailProduct,
    adminCreateGalleryPost,
    adminUpdateGalleryPost,
    adminDeleteGalleryPost,
    adminGrantLoyaltyStamp,
    adminCreateOrStampByEmail,
    adminRedeemLoyaltyReward,
    seedCatalogToFirestore,
  } = useStudio();

  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');
  const [apptFilter, setApptFilter] = useState<'all' | AppointmentStatus>('all');
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [newLoyaltyEmail, setNewLoyaltyEmail] = useState('');
  const [newLoyaltyName, setNewLoyaltyName] = useState('');
  const [loyaltyFormError, setLoyaltyFormError] = useState<string | null>(null);
  const [loyaltySavingNew, setLoyaltySavingNew] = useState(false);
  const [loyaltyBusyId, setLoyaltyBusyId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [pendingEmailAction, setPendingEmailAction] = useState<{
    appt: Appointment;
    nextStatus: 'confirmed' | 'cancelled';
  } | null>(null);
  const [sendingEmailAction, setSendingEmailAction] = useState(false);
  const [emailActionError, setEmailActionError] = useState<string | null>(null);

  // New Service form state
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState<ServiceCategory>('Gel-X & Extensions');
  const [srvDuration, setSrvDuration] = useState('90');
  const [srvPrice, setSrvPrice] = useState('95');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvSaving, setSrvSaving] = useState(false);

  // New Retail form state
  const [retName, setRetName] = useState('');
  const [retCategory, setRetCategory] = useState<RetailCategory>('Cuticle Care');
  const [retPrice, setRetPrice] = useState('28');
  const [retStock, setRetStock] = useState('12');
  const [retDesc, setRetDesc] = useState('');
  const [retSaving, setRetSaving] = useState(false);

  const [confirmDeleteGalleryId, setConfirmDeleteGalleryId] = useState<string | null>(null);
  const [galleryComposerOpen, setGalleryComposerOpen] = useState(false);
  const [editingGalleryPost, setEditingGalleryPost] = useState<GalleryPost | null>(null);
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState<GalleryCategory>('Signature Nail Art');
  const [galShape, setGalShape] = useState<NailShape>('Almond');
  const [galShade, setGalShade] = useState('Dusty Rose');
  const [galArtist, setGalArtist] = useState('Eshin');
  const [galCaption, setGalCaption] = useState('');
  const [galImageUrl, setGalImageUrl] = useState('');
  const [galFeatured, setGalFeatured] = useState(false);
  const [galProcessingImg, setGalProcessingImg] = useState(false);
  const [galSaving, setGalSaving] = useState(false);
  const [galError, setGalError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-[#F2ECEB] min-h-[70vh] flex items-center justify-center px-6 py-16">
        <div className="neu-surface max-w-md w-full p-8 text-center space-y-5">
          <div className="w-12 h-12 mx-auto neu-inset rounded-2xl flex items-center justify-center text-[#8A5A5C]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
            Admin Access Required
          </h1>
          <p className="text-xs sm:text-sm text-[#554C4B] leading-relaxed">
            Sign in with the authorized studio owner Google account to open the Studio Admin
            Dashboard.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="w-full py-3 neu-btn-ink text-sm font-medium cursor-pointer"
            >
              Sign in as Studio Admin
            </button>
            <button
              type="button"
              onClick={onBackToStudio}
              className="w-full py-2.5 neu-btn text-xs font-medium text-[#554C4B] cursor-pointer"
            >
              Return to Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAppointments =
    apptFilter === 'all'
      ? appointments
      : appointments.filter((a) => a.status === apptFilter);

  const activeBookingsCount = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed' || a.status === 'in_chair',
  ).length;

  const flashNotice = (msg: string) => {
    setErrorNotice(null);
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    setErrorNotice(null);
    try {
      await connectAdminGmail();
      flashNotice('Gmail connected. Confirmation and cancellation emails are ready to send.');
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Unable to connect Gmail account.');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    try {
      await seedCatalogToFirestore();
      flashNotice('Default studio services, artists, and retail catalog synced to Firestore.');
    } finally {
      setSyncingCatalog(false);
    }
  };

  const handleApptStatus = async (appt: Appointment, nextStatus: AppointmentStatus) => {
    if (nextStatus === 'confirmed' || nextStatus === 'cancelled') {
      setEmailActionError(null);
      setPendingEmailAction({ appt, nextStatus });
      return;
    }
    await adminUpdateAppointment(appt.id, { status: nextStatus });
    flashNotice(`Updated ${appt.bookingCode} to ${nextStatus.replace('_', ' ')}.`);
  };

  const handleExecutePendingEmailAction = async () => {
    if (!pendingEmailAction) return;
    setSendingEmailAction(true);
    setEmailActionError(null);
    try {
      await adminConfirmOrCancelWithEmail(
        pendingEmailAction.appt,
        pendingEmailAction.nextStatus,
      );
      const { appt, nextStatus } = pendingEmailAction;
      setPendingEmailAction(null);
      if (nextStatus === 'confirmed') {
        flashNotice(
          `Confirmed ${appt.bookingCode} and sent confirmation email to ${appt.clientEmail}.`,
        );
      } else {
        flashNotice(
          `Cancelled ${appt.bookingCode} and sent cancellation email to ${appt.clientEmail}.`,
        );
      }
    } catch (err) {
      setEmailActionError(
        err instanceof Error ? err.message : 'Could not send email via Gmail. Please try again.',
      );
    } finally {
      setSendingEmailAction(false);
    }
  };

  const normalizedSearch = loyaltySearch.trim().toLowerCase();
  const filteredLoyaltyCards = allLoyaltyCards.filter((card) => {
    if (!normalizedSearch) return true;
    return (
      card.clientEmail.toLowerCase().includes(normalizedSearch) ||
      card.clientName.toLowerCase().includes(normalizedSearch) ||
      card.cardCode.toLowerCase().includes(normalizedSearch)
    );
  });

  const handleAddEmailAndStamp = async (e: FormEvent, prefillEmail?: string) => {
    e.preventDefault();
    const targetEmail = (prefillEmail ?? newLoyaltyEmail).trim().toLowerCase();
    setLoyaltyFormError(null);
    if (!targetEmail || !targetEmail.includes('@') || targetEmail.length < 5) {
      setLoyaltyFormError('Please enter a valid client email address.');
      return;
    }
    setLoyaltySavingNew(true);
    try {
      const res = await adminCreateOrStampByEmail({
        email: targetEmail,
        clientName: newLoyaltyName.trim(),
        initialStamps: 1,
      });
      setNewLoyaltyEmail('');
      setNewLoyaltyName('');
      setLoyaltySearch(res.clientEmail);
      flashNotice(
        res.created
          ? `Added ${res.clientEmail} (${res.cardCode}) and gave 1 stamp.`
          : `Added +1 stamp to ${res.clientEmail} (${res.stamps}/10).`,
      );
    } catch (err) {
      setLoyaltyFormError(err instanceof Error ? err.message : 'Unable to add loyalty stamp.');
    } finally {
      setLoyaltySavingNew(false);
    }
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (srvName.trim().length < 2 || srvDesc.trim().length < 5) return;
    setSrvSaving(true);
    try {
      const id = `srv_${Date.now().toString(36)}`;
      await adminUpsertService({
        id,
        name: srvName.trim(),
        category: srvCategory,
        description: srvDesc.trim(),
        durationMin: Number(srvDuration) || 75,
        price: Number(srvPrice) || 80,
        featured: true,
        active: true,
        sortOrder: services.length + 1,
      });
      setSrvName('');
      setSrvDesc('');
      flashNotice(`Added service "${srvName.trim()}".`);
    } finally {
      setSrvSaving(false);
    }
  };

  const handleAddRetail = async (e: FormEvent) => {
    e.preventDefault();
    if (retName.trim().length < 2 || retDesc.trim().length < 5) return;
    setRetSaving(true);
    try {
      const id = `ret_${Date.now().toString(36)}`;
      await adminUpsertRetailProduct({
        id,
        name: retName.trim(),
        category: retCategory,
        description: retDesc.trim(),
        price: Number(retPrice) || 25,
        stock: Number(retStock) || 10,
        shadeHex: '#D2AAAB',
        active: true,
      });
      setRetName('');
      setRetDesc('');
      flashNotice(`Added care product "${retName.trim()}".`);
    } finally {
      setRetSaving(false);
    }
  };

  const openCreateGalleryModal = () => {
    setEditingGalleryPost(null);
    setGalTitle('');
    setGalCategory('Signature Nail Art');
    setGalShape('Almond');
    setGalShade('Dusty Rose');
    setGalArtist('Eshin');
    setGalCaption('');
    setGalImageUrl('');
    setGalFeatured(false);
    setGalError(null);
    setGalleryComposerOpen(true);
  };

  const openEditGalleryModal = (post: GalleryPost) => {
    setEditingGalleryPost(post);
    setGalTitle(post.title);
    setGalCategory(post.category);
    setGalShape(post.nailShape);
    setGalShade(post.shadeName);
    setGalArtist(post.artistName);
    setGalCaption(post.caption);
    setGalImageUrl(post.imageUrl);
    setGalFeatured(post.featured);
    setGalError(null);
    setGalleryComposerOpen(true);
  };

  const handleGalleryFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalProcessingImg(true);
    setGalError(null);
    try {
      const compressed = await compressImageFile(file);
      setGalImageUrl(compressed);
    } catch (err) {
      setGalError(err instanceof Error ? err.message : 'Unable to process selected photo.');
    } finally {
      setGalProcessingImg(false);
      e.target.value = '';
    }
  };

  const handleSubmitGalleryPost = async (e: FormEvent) => {
    e.preventDefault();
    setGalError(null);
    if (galTitle.trim().length < 2) {
      setGalError('Please enter a title for this nail set.');
      return;
    }
    if (galCaption.trim().length < 2) {
      setGalError('Please write a short caption or note.');
      return;
    }
    if (galImageUrl.trim().length < 10) {
      setGalError('Please upload a photo or paste an image URL.');
      return;
    }
    setGalSaving(true);
    try {
      const payload = {
        title: galTitle.trim(),
        caption: galCaption.trim(),
        imageUrl: galImageUrl.trim(),
        category: galCategory,
        nailShape: galShape,
        shadeName: galShade.trim(),
        artistName: galArtist.trim() || 'Eshin',
        featured: galFeatured,
      };
      if (editingGalleryPost) {
        await adminUpdateGalleryPost(editingGalleryPost.id, payload);
        flashNotice(`Updated "${payload.title}" in gallery.`);
      } else {
        await adminCreateGalleryPost(payload);
        flashNotice(`Published "${payload.title}" to public gallery.`);
      }
      setGalleryComposerOpen(false);
      setEditingGalleryPost(null);
    } catch (err) {
      setGalError(err instanceof Error ? err.message : 'Could not publish gallery post.');
    } finally {
      setGalSaving(false);
    }
  };

  return (
    <div className="bg-[#F2ECEB] min-h-[80vh] py-6 sm:py-10 lg:py-14">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 space-y-6 sm:space-y-8">
        {/* Top Admin Header */}
        <div className="neu-surface p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8A5A5C] font-medium break-all">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Studio Owner Console · {user?.email}</span>
              </div>
              <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-semibold text-[#141212]">
                Love Those Nails — Admin
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                disabled={connectingGmail}
                onClick={handleConnectGmail}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium cursor-pointer disabled:opacity-50 ${
                  gmailConnected ? 'neu-btn text-[#16A34A]' : 'neu-btn-rose text-[#141212]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>
                  {connectingGmail
                    ? 'Connecting Gmail...'
                    : gmailConnected
                      ? 'Gmail Ready'
                      : 'Connect Gmail'}
                </span>
              </button>
              {!catalogSynced && (
                <button
                  type="button"
                  disabled={syncingCatalog}
                  onClick={handleSyncCatalog}
                  className="inline-flex items-center gap-2 px-4 py-2.5 neu-btn-rose text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingCatalog ? 'animate-spin' : ''}`} />
                  <span>{syncingCatalog ? 'Syncing Catalog...' : 'Sync Default Catalog'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onBackToStudio}
                className="inline-flex items-center gap-2 px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>View Public Site</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOutUser();
                  onBackToStudio();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 neu-btn text-xs font-medium text-[#8E353B] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="neu-divider" />

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="neu-inset p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                Active Bookings
              </p>
              <p className="font-mono text-2xl font-semibold text-[#141212] tabular-nums">
                {activeBookingsCount}
              </p>
            </div>
            <div className="neu-inset p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                Gallery Posts
              </p>
              <p className="font-mono text-2xl font-semibold text-[#141212] tabular-nums">
                {galleryPosts.length}
              </p>
            </div>
            <div className="neu-inset p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                VIP Loyalty Cards
              </p>
              <p className="font-mono text-2xl font-semibold text-[#141212] tabular-nums">
                {allLoyaltyCards.length}
              </p>
            </div>
          </div>

          {/* Admin Section Tabs */}
          <div className="grid grid-cols-2 sm:inline-flex flex-wrap gap-2 neu-inset p-2 rounded-2xl w-full sm:w-auto">
            {(
              [
                { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
                { id: 'calendar', label: 'Calendar', icon: Calendar },
                { id: 'gallery', label: 'Gallery Posts', icon: ImageIcon },
                { id: 'loyalty', label: 'Loyalty Cards', icon: Award },
                { id: 'catalog', label: 'Services & Shop', icon: Sparkles },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  id === 'catalog' ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  activeTab === id ? 'neu-btn-ink' : 'text-[#554C4B] hover:text-[#141212]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {statusNotice && (
            <div className="neu-inset p-3.5 text-xs font-medium text-[#16A34A]">
              {statusNotice}
            </div>
          )}

          {errorNotice && (
            <div className="neu-inset p-3.5 text-xs font-medium text-[#8E353B]">
              {errorNotice}
            </div>
          )}
        </div>

        {/* TAB 1: Appointments */}
        {activeTab === 'appointments' && (
          <div className="neu-surface p-5 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                  Studio Appointments
                </h2>
                <p className="text-xs text-[#554C4B] mt-0.5">
                  Confirm, check in, or cancel client bookings and inspect email reminders.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 neu-inset p-1.5 rounded-xl w-full sm:w-auto">
                {(['all', 'pending', 'confirmed', 'in_chair', 'completed', 'cancelled'] as const).map(
                  (f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setApptFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                        apptFilter === f ? 'neu-btn-ink' : 'text-[#554C4B]'
                      }`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="neu-divider" />

            {filteredAppointments.length === 0 ? (
              <p className="text-sm text-[#554C4B] py-8 text-center">
                No appointments match this filter.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appt) => {
                  const log = emailLogs.find((l) => l.appointmentId === appt.id);
                  return (
                    <div
                      key={appt.id}
                      className="neu-inset p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-[#141212]">
                            {appt.bookingCode}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A5A5C]">
                            {appt.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-mono text-[#554C4B]">
                            {appt.date} · {appt.timeSlot}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-[#141212] break-words">
                          {appt.clientName}{' '}
                          <span className="text-xs font-normal text-[#554C4B] break-all">
                            ({appt.clientEmail} · {appt.clientPhone})
                          </span>
                        </p>
                        <p className="text-xs text-[#554C4B]">
                          {appt.serviceName} · {appt.nailShape} · {appt.shadePreference} · $
                          {appt.totalPrice}
                        </p>
                        {appt.notes && (
                          <p className="text-xs text-[#554C4B] italic">Note: {appt.notes}</p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-[#554C4B] pt-1">
                          <Mail className="w-3 h-3 text-[#8A5A5C] shrink-0" />
                          <span>
                            {appt.status === 'pending' ? (
                              'Awaiting admin confirm · Gmail confirmation sends on approval'
                            ) : appt.status === 'cancelled' ? (
                              log?.lastStatusNotified === 'cancelled'
                                ? `Cancellation email sent to ${appt.clientEmail}`
                                : 'Cancelled (no cancellation email sent yet)'
                            ) : log?.confirmationSentAt ? (
                              <span className="text-[#16A34A] font-medium">
                                Confirmation email sent to {appt.clientEmail}
                              </span>
                            ) : log?.lastError ? (
                              <span className="text-[#8E353B]">
                                Email failed: {log.lastError}
                              </span>
                            ) : (
                              'Confirmed in schedule · Click "Send Confirm Email" to email client'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {appt.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApptStatus(appt, 'confirmed')}
                            className="px-3.5 py-2 neu-btn-ink text-xs font-medium cursor-pointer"
                          >
                            Confirm &amp; Email
                          </button>
                        )}
                        {(appt.status === 'confirmed' || appt.status === 'in_chair') &&
                          !log?.confirmationSentAt && (
                            <button
                              type="button"
                              onClick={() => handleApptStatus(appt, 'confirmed')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send Confirm Email</span>
                            </button>
                          )}
                        {(appt.status === 'pending' || appt.status === 'confirmed') && (
                          <button
                            type="button"
                            onClick={() => handleApptStatus(appt, 'in_chair')}
                            className="px-3.5 py-2 neu-btn-rose text-xs font-medium cursor-pointer"
                          >
                            In Chair
                          </button>
                        )}
                        {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleApptStatus(appt, 'completed')}
                            className="px-3.5 py-2 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleApptStatus(appt, 'cancelled')}
                            className="px-3.5 py-2 neu-btn text-xs font-medium text-[#8E353B] cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Studio Schedule Calendar */}
        {activeTab === 'calendar' && (
          <AdminCalendar
            appointments={appointments}
            bookedSlots={bookedSlots}
            onUpdateStatus={handleApptStatus}
          />
        )}

        {/* TAB 3: Gallery Manager */}
        {activeTab === 'gallery' && (
          <div className="neu-surface p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                  Recent Work Gallery
                </h2>
                <p className="text-xs text-[#554C4B] mt-0.5">
                  Post, edit, or remove recent nail sets displayed on the public Gallery page.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                >
                  View Public Gallery
                </button>
                <button
                  type="button"
                  onClick={openCreateGalleryModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-ink text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Recent Work</span>
                </button>
              </div>
            </div>

            <div className="neu-divider" />

            {galleryPosts.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-[#554C4B]">No gallery photos posted yet.</p>
                <button
                  type="button"
                  onClick={openCreateGalleryModal}
                  className="px-5 py-2.5 neu-btn-rose text-xs font-medium cursor-pointer"
                >
                  Post Your First Work
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryPosts.map((post) => (
                  <div key={post.id} className="neu-inset p-4 space-y-3">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#EBE3E2]">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-[#141212]">{post.title}</p>
                      <p className="text-xs text-[#554C4B]">
                        {post.nailShape}
                        {post.shadeName ? ` · ${post.shadeName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => openEditGalleryModal(post)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#141212] underline underline-offset-4 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {confirmDeleteGalleryId === post.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await adminDeleteGalleryPost(post.id);
                              setConfirmDeleteGalleryId(null);
                              flashNotice('Gallery post removed.');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 neu-btn-ink text-[11px] cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGalleryId(null)}
                            className="px-2 py-1 neu-btn text-[11px] text-[#554C4B] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGalleryId(post.id)}
                          className="inline-flex items-center gap-1 text-xs text-[#8E353B] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Loyalty Cards Manager */}
        {activeTab === 'loyalty' && (
          <div className="neu-surface p-5 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                  Client Loyalty Cards ({allLoyaltyCards.length})
                </h2>
                <p className="text-xs text-[#554C4B] mt-0.5">
                  Search a client&apos;s email to add a stamp. If the email is not listed yet, add
                  their email below to issue a card with +1 stamp.
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-[#554C4B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={loyaltySearch}
                  onChange={(e) => {
                    setLoyaltySearch(e.target.value);
                    setLoyaltyFormError(null);
                  }}
                  placeholder="Search client email or VIP code..."
                  className="w-full neu-input pl-9 pr-3.5 py-2.5 text-xs text-[#141212]"
                />
              </div>
            </div>

            <div className="neu-divider" />

            {/* Add New Client Email & Stamp Form */}
            <form
              onSubmit={(e) => handleAddEmailAndStamp(e)}
              className="neu-inset p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#141212]">
                  Add Client Email &amp; Issue Stamp
                </p>
                {normalizedSearch && filteredLoyaltyCards.length === 0 && (
                  <button
                    type="button"
                    disabled={loyaltySavingNew}
                    onClick={(e) => handleAddEmailAndStamp(e, loyaltySearch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 neu-btn-rose text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add &quot;{loyaltySearch.trim()}&quot; + 1 Stamp</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="email"
                  required
                  value={newLoyaltyEmail}
                  onChange={(e) => setNewLoyaltyEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="sm:col-span-5 neu-input px-3.5 py-2.5 text-xs text-[#141212]"
                />
                <input
                  type="text"
                  maxLength={100}
                  value={newLoyaltyName}
                  onChange={(e) => setNewLoyaltyName(e.target.value)}
                  placeholder="Client name (optional)"
                  className="sm:col-span-4 neu-input px-3.5 py-2.5 text-xs text-[#141212]"
                />
                <button
                  type="submit"
                  disabled={loyaltySavingNew}
                  className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 neu-btn-ink text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loyaltySavingNew ? 'Saving...' : 'Add Email & +1 Stamp'}</span>
                </button>
              </div>

              {loyaltyFormError && (
                <p className="text-xs text-[#8E353B]">{loyaltyFormError}</p>
              )}
            </form>

            {filteredLoyaltyCards.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-[#554C4B]">
                  {normalizedSearch
                    ? `No loyalty card found for "${loyaltySearch.trim()}".`
                    : 'No client loyalty cards yet. Enter a client email above to add their first stamp.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLoyaltyCards.map((card) => {
                  const busy = loyaltyBusyId === card.id;
                  const readyToRedeem = card.stamps >= 10;
                  return (
                    <div
                      key={card.id}
                      className="neu-inset p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-xs font-semibold text-[#141212]">
                            {card.cardCode}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#8A5A5C] tabular-nums">
                            {card.stamps} / 10 Stamps
                          </span>
                          <span className="text-xs text-[#554C4B] tabular-nums">
                            {card.totalVisits} visits · {card.rewardsRedeemed} redeemed
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-[#141212] break-all">
                          {card.clientEmail}{' '}
                          <span className="text-xs font-normal text-[#554C4B]">
                            ({card.clientName})
                          </span>
                        </p>

                        {/* 10-slot mini stamp progress */}
                        <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5 max-w-[260px]" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, idx) => (
                            <span
                              key={idx}
                              className={`h-2.5 flex-1 rounded-full transition-colors ${
                                idx < card.stamps ? 'bg-[#141212]' : 'bg-[#D8CECD]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busy || card.stamps <= 0}
                          onClick={async () => {
                            setLoyaltyBusyId(card.id);
                            try {
                              await adminGrantLoyaltyStamp(card.id, -1);
                              flashNotice(`Removed 1 stamp from ${card.clientEmail}.`);
                            } finally {
                              setLoyaltyBusyId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 neu-btn text-xs font-medium text-[#554C4B] cursor-pointer disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>1 Stamp</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy || card.stamps >= 10}
                          onClick={async () => {
                            setLoyaltyBusyId(card.id);
                            try {
                              await adminGrantLoyaltyStamp(card.id, 1);
                              flashNotice(`Added +1 loyalty stamp to ${card.clientEmail}.`);
                            } finally {
                              setLoyaltyBusyId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-2 neu-btn-ink text-xs font-medium cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>1 Stamp</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy || !readyToRedeem}
                          onClick={async () => {
                            setLoyaltyBusyId(card.id);
                            try {
                              await adminRedeemLoyaltyReward(card.id);
                              flashNotice(
                                `Redeemed complimentary set reward for ${card.clientEmail} and reset card.`,
                              );
                            } finally {
                              setLoyaltyBusyId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 neu-btn-rose text-xs font-medium cursor-pointer disabled:opacity-40"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Redeem Reward</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Services & Retail Catalog */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="neu-surface p-6 sm:p-8 space-y-6">
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                Service Menu ({services.length})
              </h2>
              <form onSubmit={handleAddService} className="neu-inset p-4 space-y-3">
                <p className="text-xs font-semibold text-[#141212]">Add New Treatment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={srvName}
                    onChange={(e) => setSrvName(e.target.value)}
                    placeholder="Service title"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                  <select
                    value={srvCategory}
                    onChange={(e) => setSrvCategory(e.target.value as ServiceCategory)}
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(e.target.value)}
                    placeholder="Duration (min)"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(e.target.value)}
                    placeholder="Price ($)"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="Treatment description..."
                  className="w-full neu-input px-3 py-2 text-xs text-[#141212]"
                />
                <button
                  type="submit"
                  disabled={srvSaving}
                  className="px-4 py-2 neu-btn-ink text-xs font-medium cursor-pointer"
                >
                  {srvSaving ? 'Saving...' : 'Add Service'}
                </button>
              </form>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="neu-surface-sm px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#141212]">{srv.name}</p>
                      <p className="text-xs text-[#554C4B]">
                        {srv.category} · {srv.durationMin}m · ${srv.price}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminDeleteService(srv.id);
                        flashNotice(`Deleted service "${srv.name}".`);
                      }}
                      className="p-2 neu-btn text-[#8E353B] cursor-pointer"
                      aria-label={`Delete ${srv.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-surface p-6 sm:p-8 space-y-6">
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                Care Apothecary ({retailProducts.length})
              </h2>
              <form onSubmit={handleAddRetail} className="neu-inset p-4 space-y-3">
                <p className="text-xs font-semibold text-[#141212]">Add Care Item</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={retName}
                    onChange={(e) => setRetName(e.target.value)}
                    placeholder="Product name"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                  <select
                    value={retCategory}
                    onChange={(e) => setRetCategory(e.target.value as RetailCategory)}
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  >
                    {RETAIL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={retPrice}
                    onChange={(e) => setRetPrice(e.target.value)}
                    placeholder="Price ($)"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={retStock}
                    onChange={(e) => setRetStock(e.target.value)}
                    placeholder="Stock qty"
                    className="neu-input px-3 py-2 text-xs text-[#141212]"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={retDesc}
                  onChange={(e) => setRetDesc(e.target.value)}
                  placeholder="Product description..."
                  className="w-full neu-input px-3 py-2 text-xs text-[#141212]"
                />
                <button
                  type="submit"
                  disabled={retSaving}
                  className="px-4 py-2 neu-btn-ink text-xs font-medium cursor-pointer"
                >
                  {retSaving ? 'Saving...' : 'Add Product'}
                </button>
              </form>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {retailProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="neu-surface-sm px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#141212]">{prod.name}</p>
                      <p className="text-xs text-[#554C4B]">
                        {prod.category} · ${prod.price} · {prod.stock} in stock
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminDeleteRetailProduct(prod.id);
                        flashNotice(`Deleted "${prod.name}".`);
                      }}
                      className="p-2 neu-btn text-[#8E353B] cursor-pointer"
                      aria-label={`Delete ${prod.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Admin Gallery Post Composer Modal */}
      {galleryComposerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#141212]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingGalleryPost ? 'Edit Gallery Work' : 'Post Recent Nail Work'}
        >
          <div className="w-full max-w-2xl neu-surface max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
                  Admin Gallery Manager
                </p>
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212] mt-1">
                  {editingGalleryPost ? 'Edit Nail Set Post' : 'Post Recent Work'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setGalleryComposerOpen(false)}
                aria-label="Close gallery composer"
                className="p-2.5 neu-btn text-[#141212] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitGalleryPost} className="space-y-5">
              <div className="space-y-3">
                <span className="block text-xs font-medium text-[#141212]">
                  Nail Set Photo
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 neu-inset p-2 rounded-2xl">
                    <div className="aspect-[4/5] rounded-xl bg-[#EBE3E2] overflow-hidden flex items-center justify-center">
                      {galImageUrl ? (
                        <img
                          src={galImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 space-y-2 text-[#554C4B]">
                          <ImagePlus className="w-7 h-7 mx-auto opacity-70" />
                          <p className="text-xs">Photo preview</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <label className="neu-btn px-4 py-3 flex items-center justify-center gap-2 text-xs font-medium text-[#141212] cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>
                        {galProcessingImg ? 'Optimizing photo...' : 'Upload Photo from Device'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryFileChange}
                        className="sr-only"
                      />
                    </label>

                    <label className="block text-[11px] text-[#554C4B]">
                      Or paste image URL (https://)
                      <input
                        type="text"
                        value={galImageUrl.startsWith('data:') ? '' : galImageUrl}
                        onChange={(e) => setGalImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full neu-input px-3.5 py-2.5 text-xs text-[#141212] focus:outline-none"
                      />
                    </label>

                    {galImageUrl && (
                      <button
                        type="button"
                        onClick={() => setGalImageUrl('')}
                        className="text-xs text-[#8E353B] underline cursor-pointer"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-medium text-[#141212]">
                  Title
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={galTitle}
                    onChange={(e) => setGalTitle(e.target.value)}
                    placeholder="e.g., Dusty Rose Glass Cat-Eye"
                    className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-medium text-[#141212]">
                    Nail Shape
                    <select
                      value={galShape}
                      onChange={(e) => setGalShape(e.target.value as NailShape)}
                      className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] focus:outline-none"
                    >
                      {NAIL_SHAPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-[#141212]">
                    Shade / Finish Note
                    <input
                      type="text"
                      maxLength={60}
                      value={galShade}
                      onChange={(e) => setGalShade(e.target.value)}
                      placeholder="e.g., Dusty Rose · Pearl Chrome"
                      className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <label className="block text-xs font-medium text-[#141212]">
                  Artist Name
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={galArtist}
                    onChange={(e) => setGalArtist(e.target.value)}
                    className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] focus:outline-none"
                  />
                </label>

                <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#141212] sm:pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={galFeatured}
                    onChange={(e) => setGalFeatured(e.target.checked)}
                    className="accent-[#141212] w-4 h-4"
                  />
                  <span>Highlight as Featured Set</span>
                </label>
              </div>

              <label className="block text-xs font-medium text-[#141212]">
                Caption &amp; Studio Notes
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={galCaption}
                  onChange={(e) => setGalCaption(e.target.value)}
                  placeholder="Describe the sculpted length, pigments, or custom hand-painted details..."
                  className="mt-1.5 w-full neu-input px-3.5 py-2.5 text-sm text-[#141212] focus:outline-none resize-none"
                />
              </label>

              {galError && (
                <div className="neu-inset p-3.5 text-xs text-[#8E353B]">{galError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGalleryComposerOpen(false)}
                  className="px-5 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={galSaving || galProcessingImg}
                  className="px-6 py-2.5 neu-btn-ink text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {galSaving
                    ? 'Publishing...'
                    : editingGalleryPost
                      ? 'Save Changes'
                      : 'Publish to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Explicit Confirmation Dialog Before Sending Gmail Message */}
      {pendingEmailAction &&
        (() => {
          const { appt, nextStatus } = pendingEmailAction;
          const preview = buildBookingEmailPreview(nextStatus, appt);
          const isConfirm = nextStatus === 'confirmed';
          return (
            <div
              className="fixed inset-0 z-50 bg-[#141212]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm sending booking email via Gmail"
            >
              <div className="w-full max-w-lg neu-surface p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A5A5C] font-medium">
                      Gmail Confirmation Required
                    </p>
                    <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212] mt-1">
                      {isConfirm
                        ? 'Confirm Appointment & Email Client?'
                        : 'Cancel Appointment & Email Client?'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={sendingEmailAction}
                    onClick={() => setPendingEmailAction(null)}
                    aria-label="Close email confirmation dialog"
                    className="p-2.5 neu-btn text-[#141212] cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="neu-divider" />

                <div className="neu-inset p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#554C4B] shrink-0">From</span>
                    <span className="font-mono text-[#141212] text-right break-all">
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#554C4B] shrink-0">To</span>
                    <span className="font-mono font-semibold text-[#141212] text-right break-all">
                      {preview.to}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[#554C4B] shrink-0">Subject</span>
                    <span className="text-[#141212] text-right break-words">
                      {preview.subject}
                    </span>
                  </div>
                  <div className="neu-divider" />
                  <p className="text-[#554C4B] leading-relaxed">
                    {appt.clientName} · {appt.serviceName} ({appt.bookingCode}) on{' '}
                    <span className="font-medium text-[#141212]">
                      {preview.readableDate} at {appt.timeSlot}
                    </span>
                    .
                  </p>
                </div>

                {!gmailConnected && (
                  <p className="text-[11px] text-[#554C4B] leading-relaxed">
                    Clicking send will ask your Google account to grant Gmail send permission for
                    this studio session.
                  </p>
                )}

                {emailActionError && (
                  <div className="neu-inset p-3.5 text-xs text-[#8E353B] leading-relaxed">
                    {emailActionError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={sendingEmailAction}
                    onClick={() => setPendingEmailAction(null)}
                    className="px-5 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingEmailAction}
                    onClick={handleExecutePendingEmailAction}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-50 ${
                      isConfirm ? 'neu-btn-ink' : 'neu-btn-rose text-[#8E353B]'
                    }`}
                  >
                    {sendingEmailAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending via Gmail...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {isConfirm
                            ? 'Confirm & Send Email'
                            : 'Cancel Booking & Send Email'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
