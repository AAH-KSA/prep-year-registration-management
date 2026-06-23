
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, getDoc, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const defaultDb = getFirestore(app);
const configuredDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : defaultDb;

export let db: Firestore = configuredDb;

// Export a promise that resolves when the database verification is complete
export const dbConnectionPromise = (async () => {
  if (configuredDb !== defaultDb) {
    try {
      // Create a timeout promise to ensure we don't hang for more than 3.5 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 3500);
      });

      const fetchPromise = getDocFromServer(doc(configuredDb, '_test_connection_internal_unique_', 'check'));
      await Promise.race([fetchPromise, timeoutPromise]);
      console.log("Firestore: Successfully connected to custom database:", firebaseConfig.firestoreDatabaseId);
    } catch (err: any) {
      const errorMsg = String(err?.message || err).toLowerCase();
      if (errorMsg.includes('permission') || errorMsg.includes('insufficient permissions')) {
        console.log("Firestore: Custom database validated successfully via permission confirmation.");
        return;
      }
      
      console.warn("Firestore: Custom database connection failed or timed out. Falling back to the '(default)' database. Error:", err?.message || err);
      db = defaultDb;
    }
  }
})();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginAnonymously = () => signInAnonymously(auth);
export const loginWithEmail = async (email: string, pass: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      if (!pass || pass.length < 6) {
        // Firebase requires at least 6 characters. If the original sign-in failed,
        // we can't automatic-register with <6 chars anyway, so throw the original sign-in error.
        throw error;
      }
      try {
        return await createUserWithEmailAndPassword(auth, email, pass);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          // The user actually exists, meaning original wrong password error was correct
          throw error;
        }
        throw createErr;
      }
    }
    throw error;
  }
};
export const changePassword = (newPass: string) => {
  if (auth.currentUser) return updatePassword(auth.currentUser, newPass);
  throw new Error("No user logged in");
};

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
