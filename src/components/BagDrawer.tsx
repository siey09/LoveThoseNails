import { CheckCircle2, Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import type { RetailOrder } from '../types/studio';

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function BagDrawer() {
  const {
    user,
    profile,
    cart,
    isBagOpen,
    setIsBagOpen,
    updateCartQty,
    signInWithGoogle,
    createRetailOrder,
  } = useStudio();

  const [pickupDate, setPickupDate] = useState(getTomorrowIso);
  const [clientName, setClientName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<RetailOrder | null>(null);

  if (!isBagOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        currentUser = await signInWithGoogle();
      }
      const order = await createRetailOrder(
        pickupDate,
        clientName || profile?.displayName || currentUser?.displayName || 'Studio Client',
      );
      setConfirmedOrder(order);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to place reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141212]/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Studio Care Bag"
    >
      <div className="w-full max-w-md bg-[#F2ECEB] h-full shadow-[-10px_0_30px_rgba(160,136,136,0.45)] flex flex-col justify-between">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#141212]">
              Studio Care Bag
            </h2>
            <p className="text-xs text-[#554C4B]">Reserve items for in-studio pickup</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              setIsBagOpen(false);
            }}
            aria-label="Close Studio Bag"
            className="p-2.5 neu-btn text-[#141212] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6">
          <div className="neu-divider" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {confirmedOrder ? (
            <div className="neu-inset p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#16A34A]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Studio Pickup Reserved</span>
              </div>
              <p className="font-mono text-lg font-semibold text-[#141212]">
                {confirmedOrder.orderCode}
              </p>
              <p className="text-xs text-[#554C4B]">
                Prepared for {confirmedOrder.clientName} · Pickup date{' '}
                <span className="font-mono tabular-nums">{confirmedOrder.pickupDate}</span>
              </p>
              <div className="neu-divider" />
              <ul className="text-xs text-[#141212] space-y-1">
                {confirmedOrder.itemNames.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="neu-divider" />
              <p className="text-sm font-mono font-semibold text-[#141212]">
                Total Due at Studio: ${confirmedOrder.totalAmount.toFixed(2)}
              </p>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm font-medium text-[#141212]">Your studio bag is empty</p>
              <p className="text-xs text-[#554C4B]">
                Add cuticle elixirs, glass files, or press-on sets to reserve them for your next
                visit.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="neu-surface-sm p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#141212] truncate">{product.name}</p>
                    <p className="text-xs font-mono tabular-nums text-[#554C4B] mt-0.5">
                      ${product.price.toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQty(product.id, -1)}
                      aria-label={`Decrease quantity of ${product.name}`}
                      className="w-8 h-8 neu-btn flex items-center justify-center text-[#141212] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(product.id, 1)}
                      aria-label={`Increase quantity of ${product.name}`}
                      className="w-8 h-8 neu-btn flex items-center justify-center text-[#141212] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              <form id="bag-reserve-form" onSubmit={handleSubmitOrder} className="space-y-4 pt-3">
                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Pickup Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName || profile?.displayName || user?.displayName || ''}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 neu-input text-sm text-[#141212]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Preferred Studio Pickup Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 neu-input text-sm font-mono text-[#141212]"
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3">
                    {errorMsg}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        {cart.length > 0 && !confirmedOrder && (
          <div className="p-6 space-y-4">
            <div className="neu-divider" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#554C4B]">Reservation Subtotal</span>
              <span className="font-mono tabular-nums font-semibold text-[#141212]">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <button
              type="submit"
              form="bag-reserve-form"
              disabled={submitting}
              className="w-full py-3 px-4 neu-btn-ink text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? 'Reserving...'
                : user
                  ? 'Reserve for Studio Pickup'
                  : 'Sign in with Google & Reserve'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
