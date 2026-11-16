import { Award, Check, Gift, LogIn, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { BrandCrestImage } from './NailArtVisuals';

interface LoyaltyPageProps {
  onOpenBooking: () => void;
}

const STAMP_SLOTS = Array.from({ length: 10 }, (_, idx) => idx + 1);

export function LoyaltyPage({ onOpenBooking }: LoyaltyPageProps) {
  const { user, authReady, loyaltyCard, signInWithGoogle } = useStudio();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in with Google right now.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const stamps = loyaltyCard?.stamps ?? 0;
  const totalVisits = loyaltyCard?.totalVisits ?? 0;
  const rewardsRedeemed = loyaltyCard?.rewardsRedeemed ?? 0;
  const isRewardUnlocked = stamps >= 10;
  const stampsRemaining = Math.max(0, 10 - stamps);

  return (
    <section className="bg-[#F2ECEB] py-8 sm:py-10 lg:py-16 min-h-[75vh]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-12">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 sm:space-y-3 max-w-2xl">
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#8A5A5C]">
              Love Those Nails by Eshin · Client Rewards
            </p>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-semibold text-[#141212] tracking-tight">
              Studio VIP Loyalty Card
            </h1>
            <p className="text-sm sm:text-base text-[#554C4B] leading-relaxed">
              Earn one studio stamp for every completed appointment. Collect ten stamps to unlock a
              complimentary Signature Gel-X or BIAB set curated by Eshin.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBooking}
            className="px-6 py-3 neu-btn-ink text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
          >
            Book Next Visit
          </button>
        </div>

        <div className="neu-divider" />

        {!authReady ? (
          <div className="neu-surface p-8 sm:p-10 max-w-xl mx-auto text-center space-y-3">
            <p className="text-sm text-[#554C4B]">Loading your studio loyalty card...</p>
          </div>
        ) : !user ? (
          /* Unauthenticated Guest Preview + Google Sign-In CTA */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            <div className="lg:col-span-7 neu-rose-panel p-5 sm:p-10 flex flex-col justify-between gap-6 sm:gap-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#F2ECEB] p-1.5 shrink-0 overflow-hidden">
                    <BrandCrestImage className="w-full h-full rounded-xl shadow-none" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-[#554C4B] font-medium">
                      Studio VIP Pass
                    </p>
                    <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-semibold text-[#141212]">
                      10-Visit Stamp Card
                    </h2>
                  </div>
                </div>
                <span className="font-mono text-xs tracking-wider text-[#141212] tabular-nums shrink-0">
                  VIP-PREVIEW
                </span>
              </div>

              {/* 10 Preview Stamp Slots */}
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {STAMP_SLOTS.map((slot) => {
                  const previewFilled = slot <= 3;
                  const isMilestone = slot === 10;
                  return (
                    <div
                      key={slot}
                      className={`aspect-square rounded-xl sm:rounded-2xl p-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all ${
                        previewFilled
                          ? 'bg-[#1B1717] text-white shadow-[4px_4px_10px_rgba(145,105,106,0.45)]'
                          : isMilestone
                            ? 'bg-[#F2ECEB] text-[#8A5A5C] shadow-[inset_3px_3px_7px_rgba(174,149,149,0.42),inset_-3px_-3px_7px_rgba(255,255,255,0.92)]'
                            : 'bg-[#F2ECEB]/80 text-[#554C4B] shadow-[inset_3px_3px_7px_rgba(174,149,149,0.38),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]'
                      }`}
                    >
                      {previewFilled ? (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : isMilestone ? (
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <span className="font-mono text-[11px] sm:text-xs tabular-nums">
                          {String(slot).padStart(2, '0')}
                        </span>
                      )}
                      <span className="hidden sm:inline text-[10px] font-medium tracking-wide">
                        {isMilestone ? 'Free Set' : previewFilled ? 'Stamped' : 'Open'}
                      </span>
                      {isMilestone && (
                        <span className="sm:hidden text-[9px] font-medium leading-none">
                          Free
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#141212]">
                <span className="font-medium">
                  10th visit unlocks a Complimentary Signature Set
                </span>
                <span className="font-mono tabular-nums text-[#554C4B]">00 / 10 Stamps</span>
              </div>
            </div>

            <div className="lg:col-span-5 neu-surface p-5 sm:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="w-11 h-11 neu-inset rounded-2xl flex items-center justify-center text-[#8A5A5C]">
                  <Award className="w-5 h-5" />
                </div>
                <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                  Activate Your Personal Card
                </h2>
                <p className="text-sm text-[#554C4B] leading-relaxed">
                  Sign in with your Google account to view your personal{' '}
                  <span className="font-mono text-[#141212]">VIP</span> card and stamps. Eshin adds
                  a stamp to your email card after each studio visit.
                </p>
              </div>

              <div className="space-y-3">
                {authError && (
                  <div className="neu-inset p-3 text-xs text-[#8E353B]">{authError}</div>
                )}
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={handleGoogleSignIn}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-5 neu-btn-ink text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
                <p className="text-[11px] text-[#554C4B] text-center">
                  Linked directly to your studio bookings and client profile.
                </p>
              </div>
            </div>
          </div>
        ) : !loyaltyCard ? (
          <div className="neu-surface p-8 sm:p-10 max-w-xl mx-auto text-center space-y-3">
            <p className="text-sm text-[#554C4B]">Issuing your personal studio VIP card...</p>
          </div>
        ) : (
          /* Authenticated Client Live Loyalty Card */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Tactile Digital VIP Card */}
            <div className="lg:col-span-7 neu-rose-panel p-5 sm:p-10 flex flex-col justify-between gap-6 sm:gap-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#F2ECEB] p-1.5 shrink-0 overflow-hidden">
                    <BrandCrestImage className="w-full h-full rounded-xl shadow-none" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-[#554C4B] font-medium">
                      Studio VIP Member
                    </p>
                    <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-semibold text-[#141212] truncate">
                      {loyaltyCard.clientName}
                    </h2>
                    <p className="text-xs text-[#554C4B] break-all">{loyaltyCard.clientEmail}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-0.5 shrink-0">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#554C4B]">
                    Card Number
                  </p>
                  <p className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-[#141212] tabular-nums">
                    {loyaltyCard.cardCode}
                  </p>
                </div>
              </div>

              {/* 10 Tactile Porcelain Stamp Slots */}
              <div className="grid grid-cols-5 gap-2 sm:gap-4" aria-label="Loyalty stamp progress">
                {STAMP_SLOTS.map((slot) => {
                  const filled = slot <= stamps;
                  const isMilestone = slot === 10;
                  return (
                    <div
                      key={slot}
                      className={`aspect-square rounded-xl sm:rounded-2xl p-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all ${
                        filled
                          ? 'bg-[#1B1717] text-white shadow-[4px_4px_10px_rgba(145,105,106,0.45)]'
                          : isMilestone
                            ? 'bg-[#F2ECEB] text-[#8A5A5C] shadow-[inset_3px_3px_7px_rgba(174,149,149,0.42),inset_-3px_-3px_7px_rgba(255,255,255,0.92)]'
                            : 'bg-[#F2ECEB]/80 text-[#554C4B] shadow-[inset_3px_3px_7px_rgba(174,149,149,0.38),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]'
                      }`}
                    >
                      {filled ? (
                        isMilestone ? (
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#D2AAAB]" />
                        ) : (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        )
                      ) : isMilestone ? (
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <span className="font-mono text-[11px] sm:text-xs tabular-nums">
                          {String(slot).padStart(2, '0')}
                        </span>
                      )}
                      <span className="hidden sm:inline text-[10px] font-medium tracking-wide">
                        {isMilestone ? (filled ? 'Unlocked' : 'Free Set') : filled ? 'Stamped' : 'Empty'}
                      </span>
                      {isMilestone && (
                        <span className="sm:hidden text-[9px] font-medium leading-none">
                          {filled ? 'Gift' : 'Free'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#141212]">
                <span className="font-medium">
                  {isRewardUnlocked
                    ? 'Complimentary Signature Set unlocked — present this card at your appointment.'
                    : `${stampsRemaining} more ${stampsRemaining === 1 ? 'visit' : 'visits'} until your Complimentary Signature Set.`}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {String(stamps).padStart(2, '0')} / 10 Stamps
                </span>
              </div>
            </div>

            {/* Card Summary & Studio Perks */}
            <div className="lg:col-span-5 neu-surface p-5 sm:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#8A5A5C] font-medium">
                    Card Standing
                  </p>
                  <h3 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                    {isRewardUnlocked ? 'Reward Ready to Claim' : 'Collecting Stamps'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="neu-inset p-2.5 sm:p-3.5 space-y-1">
                    <p className="text-[10px] sm:text-[11px] text-[#554C4B]">Stamps</p>
                    <p className="font-mono text-lg sm:text-xl font-semibold text-[#141212] tabular-nums">
                      {stamps}/10
                    </p>
                  </div>
                  <div className="neu-inset p-2.5 sm:p-3.5 space-y-1">
                    <p className="text-[10px] sm:text-[11px] text-[#554C4B]">Visits</p>
                    <p className="font-mono text-lg sm:text-xl font-semibold text-[#141212] tabular-nums">
                      {totalVisits}
                    </p>
                  </div>
                  <div className="neu-inset p-2.5 sm:p-3.5 space-y-1">
                    <p className="text-[10px] sm:text-[11px] text-[#554C4B]">Redeemed</p>
                    <p className="font-mono text-lg sm:text-xl font-semibold text-[#141212] tabular-nums">
                      {rewardsRedeemed}
                    </p>
                  </div>
                </div>

                <div className="neu-inset p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-[#141212]">Milestone Perk</p>
                  <p className="text-xs text-[#554C4B] leading-relaxed">
                    {loyaltyCard.rewardNote || '10th visit unlocks a Complimentary Signature Set'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="w-full py-3.5 px-5 neu-btn-ink text-sm font-medium cursor-pointer"
                >
                  {isRewardUnlocked ? 'Book Your Complimentary Set' : 'Reserve Next Appointment'}
                </button>
                <p className="text-[11px] text-[#554C4B] leading-relaxed">
                  Stamps are added directly by Eshin using your email address after each visit.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
