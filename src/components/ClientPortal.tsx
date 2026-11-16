import { useStudio } from '../context/StudioContext';
import type { RetailOrderStatus } from '../types/studio';
import { StudioCalendar } from './StudioCalendar';

const ORDER_STATUS_META: Record<RetailOrderStatus, { label: string; style: string }> = {
  reserved: { label: 'Reserved', style: 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]' },
  ready: { label: 'Ready for Pickup', style: 'text-[#16A34A] bg-[#ECFDF5] border-[#A7F3D0]' },
  picked_up: { label: 'Picked Up', style: 'text-[#5E5554] bg-[#F3EDEC] border-[#E5DCDA]' },
  cancelled: { label: 'Cancelled', style: 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]' },
};

export function ClientPortal({
  onOpenBooking,
}: {
  onOpenBooking: (preset?: { date?: string; timeSlot?: string }) => void;
}) {
  const { user, authReady, retailOrders, careShopEnabled } = useStudio();

  if (!authReady) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="neu-surface p-8 sm:p-10 max-w-lg mx-auto text-center space-y-3">
          <p className="text-sm text-[#554C4B]">Loading your studio pass...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
        <StudioCalendar
          onSelectSlot={(date, timeSlot) => onOpenBooking({ date, timeSlot })}
        />
      </section>
    );
  }

  const myOrders = retailOrders.filter((o) => o.clientId === user.uid);

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 space-y-8 sm:space-y-10">
      <StudioCalendar
        onSelectSlot={(date, timeSlot) => onOpenBooking({ date, timeSlot })}
      />

      {/* Retail Care Reservations */}
      {(careShopEnabled || myOrders.length > 0) && (
      <div className="neu-surface p-5 sm:p-8 space-y-5">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-semibold text-[#141212]">
            Studio Care Pickup Orders
          </h2>
          <span className="text-xs font-mono tabular-nums text-[#554C4B]">
            {myOrders.length} orders
          </span>
        </div>

        <div className="neu-divider" />

        {myOrders.length === 0 ? (
          <p className="text-xs text-[#554C4B] py-4">
            No care apothecary items reserved for pickup.
          </p>
        ) : (
          <div className="space-y-3">
            {myOrders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              return (
                <div
                  key={order.id}
                  className="neu-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-[#141212]">
                        {order.orderCode}
                      </span>
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${meta.style}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#554C4B]">{order.itemNames.join(' · ')}</p>
                  </div>
                  <div className="sm:text-right font-mono tabular-nums text-xs">
                    <p className="text-[#554C4B]">Pickup {order.pickupDate}</p>
                    <p className="text-sm font-semibold text-[#141212] mt-0.5">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </section>
  );
}
