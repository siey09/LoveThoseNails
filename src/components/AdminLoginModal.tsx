import { Lock, LogOut, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useStudio } from '../context/StudioContext';
import {
  db,
  isPrimaryAdminEmail,
  PRIMARY_ADMIN_EMAILS,
} from '../lib/firebase';
import { BrandCrestImage } from './NailArtVisuals';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticatedAdmin: () => void;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onAuthenticatedAdmin,
}: AdminLoginModalProps) {
  const { user, isAdmin, signInAdminWithGoogle, signOutUser } = useStudio();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (isAdmin) {
      onClose();
      onAuthenticatedAdmin();
    }
  }, [isOpen, isAdmin, onClose, onAuthenticatedAdmin]);

  if (!isOpen) return null;

  const handleGoogleAdminLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const signedUser = await signInAdminWithGoogle();
      if (!signedUser) {
        setLoading(false);
        return;
      }
      let authorizedAdmin =
        Boolean(signedUser.emailVerified) && isPrimaryAdminEmail(signedUser.email);

      if (!authorizedAdmin && signedUser.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', signedUser.uid));
          if (adminSnap.exists()) {
            authorizedAdmin = true;
          } else if (signedUser.email) {
            const inviteSnap = await getDoc(
              doc(db, 'adminInvites', signedUser.email.trim().toLowerCase()),
            );
            authorizedAdmin = inviteSnap.exists();
          }
        } catch {
          authorizedAdmin = false;
        }
      }

      if (authorizedAdmin) {
        onClose();
        onAuthenticatedAdmin();
      } else {
        setErrorMsg(
          `Signed in as ${signedUser.email || 'another account'}. Studio Admin access is reserved for authorized studio owner accounts.`,
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141212]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Studio Admin Google Login"
    >
      <div className="w-full max-w-md neu-surface p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 bg-[#D2AAAB] rounded-xl p-1 flex items-center justify-center overflow-hidden shrink-0">
              <BrandCrestImage className="w-full h-full rounded-lg" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#554C4B]">
                Owner Portal
              </p>
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
                Studio Admin Sign In
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin sign in"
            className="p-2.5 neu-btn text-[#141212] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="neu-divider" />

        <div className="neu-inset p-4 space-y-2 text-xs text-[#554C4B] leading-relaxed">
          <div className="flex items-center gap-2 text-[#141212] font-medium">
            <ShieldCheck className="w-4 h-4 text-[#8A5A5C]" />
            <span>Authorized Admin Accounts</span>
          </div>
          <div className="space-y-0.5 font-mono text-[11px] text-[#141212]">
            {PRIMARY_ADMIN_EMAILS.map((email) => (
              <p key={email}>{email}</p>
            ))}
          </div>
          <p>
            Sign in with Google using an authorized or invited studio admin account to manage
            appointments, send Gmail confirmations, publish blogs/gallery sets, and edit
            schedules.
          </p>
        </div>

        {user && !isAdmin && (
          <div className="neu-inset p-4 text-xs space-y-2">
            <p className="text-[#554C4B]">
              Currently signed in as{' '}
              <span className="font-medium text-[#141212]">{user.email}</span> (client view).
            </p>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E353B] underline underline-offset-4 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out current account</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="neu-inset p-3.5 text-xs text-[#8E353B] leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAdminLogin}
            className="w-full py-3.5 px-5 neu-btn-ink text-sm font-medium inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>
              {loading
                ? 'Verifying Google Account...'
                : user && !isAdmin
                  ? 'Switch to Admin Google Account'
                  : 'Sign in with Google (Admin)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 neu-btn text-xs font-medium text-[#554C4B] cursor-pointer"
          >
            Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
