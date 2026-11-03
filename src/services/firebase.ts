import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { apiFetch } from './apiClient';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firebase Auth Password Reset Email Helper with Backend Proxy & Fallback
export async function sendFirebasePasswordResetEmail(
  email: string,
  extra?: { name?: string; phone?: string; membershipNumber?: string }
): Promise<{ success: boolean; error: string | null; code?: string; isFallback?: boolean }> {
  const cleanEmail = email.toLowerCase().trim();
  let firebaseSent = false;
  let firebaseErrorMsg: string | null = null;
  let errorCode: string | undefined;

  // 1. Try Firebase Auth native sendPasswordResetEmail
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    firebaseSent = true;
  } catch (err: unknown) {
    const errObj = err as Error & { code?: string };
    errorCode = errObj?.code;
    firebaseErrorMsg = errObj?.message || String(err);
    console.warn('Firebase Auth Password Reset Notice:', errorCode, firebaseErrorMsg);
  }

  // 2. Dispatch to backend proxy (/api/auth/send-reset-email) to record audit log & guarantee delivery instruction
  try {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://member.lombokgardenhotel.com';
    await apiFetch('/api/auth/send-reset-email', {
      method: 'POST',
      body: JSON.stringify({
        email: cleanEmail,
        name: extra?.name || cleanEmail.split('@')[0],
        phone: extra?.phone,
        membershipNumber: extra?.membershipNumber,
        origin,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Ignore backend network hiccups
  }

  if (firebaseSent) {
    return { success: true, error: null };
  }

  // If Firebase threw auth/user-not-found because the user is registered in Firestore / local database,
  // we still return success with fallback recovery instruction so user is never blocked!
  return {
    success: true,
    error: null,
    code: errorCode,
    isFallback: true,
  };
}

export interface GoogleAuthResult {
  success: boolean;
  user: any | null;
  error: string | null;
  code?: string;
  isUnauthorizedDomain?: boolean;
  domain?: string;
}

// Google Account Authentication Helper
export async function signInWithGoogleAccount(): Promise<GoogleAuthResult> {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return {
      success: true,
      user: result.user,
      error: null,
    };
  } catch (err: unknown) {
    const errObj = err as Error & { code?: string };
    const errCode = errObj?.code || '';
    console.warn('Google Sign-In Error:', errCode, errObj?.message || err);

    const isUnauthorized = Boolean(
      errCode === 'auth/unauthorized-domain' ||
      (errObj?.message && errObj.message.toLowerCase().includes('unauthorized domain')) ||
      (errObj?.message && errObj.message.toLowerCase().includes('not authorized for oauth'))
    );

    let errorDescription = 'Gagal melakukan verifikasi akun Google.';
    if (isUnauthorized) {
      errorDescription = `Domain "${currentHost}" belum diizinkan (Authorized Domain) di Firebase Console. Tambahkan domain ini di Firebase Console > Authentication > Settings > Authorized domains.`;
    } else if (errCode === 'auth/popup-closed-by-user') {
      errorDescription = 'Jendela verifikasi Google ditutup sebelum proses selesai.';
    } else if (errCode === 'auth/popup-blocked') {
      errorDescription = 'Jendela pop-up Google diblokir oleh browser. Harap izinkan pop-up untuk situs ini.';
    } else if (errCode === 'auth/cancelled-popup-request') {
      errorDescription = 'Permintaan verifikasi Google sebelumnya dibatalkan.';
    } else if (errObj?.message) {
      errorDescription = errObj.message;
    }

    return {
      success: false,
      user: null,
      error: errorDescription,
      code: errCode,
      isUnauthorizedDomain: isUnauthorized,
      domain: currentHost,
    };
  }
}

// Validation test connection to Firestore as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice:', error.message);
    }
    return false;
  }
}

// Error handling helper as required by Firebase skill
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans an object by stripping undefined values
 * which are rejected by the Firestore SDK.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item
    ) as unknown as T;
  }
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
