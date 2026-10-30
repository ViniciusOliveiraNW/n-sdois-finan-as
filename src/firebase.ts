import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

// Suporte para Vercel e Node.js via variáveis de ambiente com fallback para o json gerado
const getEnvVar = (viteKey: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[viteKey]) {
      return (import.meta as any).env[viteKey];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[viteKey]) {
      return process.env[viteKey];
    }
  } catch {
    // ignore
  }
  return fallback;
};

const firebaseConfig = {
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', rawConfig.projectId),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', rawConfig.appId),
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', rawConfig.apiKey),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', rawConfig.authDomain),
  firestoreDatabaseId: getEnvVar(
    'VITE_FIREBASE_DATABASE_ID',
    rawConfig.firestoreDatabaseId
  ),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', rawConfig.storageBucket),
  messagingSenderId: getEnvVar(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    rawConfig.messagingSenderId
  ),
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// CRITICAL: passar o firestoreDatabaseId para conectar ao banco provisionado
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
  path: string | null
) {
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Verifique sua conexão com o Firebase Firestore.');
    }
  }
}

testConnection();
