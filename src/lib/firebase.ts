import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'] as const;

export const adminGoogleProvider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  adminGoogleProvider.addScope(scope);
}
adminGoogleProvider.setCustomParameters({ prompt: 'select_account consent' });

export const BOOTSTRAP_ADMIN_EMAIL = 'sieyiphone07@gmail.com';
export const STUDIO_EMAIL_SENDER = 'lovethosenailsbyeshin@gmail.com';
export const PRIMARY_ADMIN_EMAILS = [
  'sieyiphone07@gmail.com',
  'lovethosenailsbyeshin@gmail.com',
] as const;

export const gmailSenderProvider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  gmailSenderProvider.addScope(scope);
}
gmailSenderProvider.setCustomParameters({
  prompt: 'select_account consent',
  login_hint: STUDIO_EMAIL_SENDER,
});

export const gmailSameAccountProvider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  gmailSameAccountProvider.addScope(scope);
}
gmailSameAccountProvider.setCustomParameters({
  login_hint: STUDIO_EMAIL_SENDER,
});

export function isPrimaryAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PRIMARY_ADMIN_EMAILS.some((adminEmail) => adminEmail === normalized);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
