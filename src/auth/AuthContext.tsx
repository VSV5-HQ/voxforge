import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getIdToken,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from '../firebase';
import {
  mapFirebaseAuthError,
  sanitizeEmail,
  sanitizeFullName,
} from './validation';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  createdAt: Date | null;
}

export interface RegisterResult {
  verificationSent: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isConfigured: boolean;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  loginWithEmail: (params: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
  registerWithEmail: (params: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<RegisterResult>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  updateFullName: (nextName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseCreatedAt(value: unknown, fallbackCreationTime?: string): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (fallbackCreationTime) {
    const parsed = new Date(fallbackCreationTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

async function ensureUserProfileDoc(
  firebaseUser: User,
  overrideName?: string
): Promise<void> {
  const profilePath = `users/${firebaseUser.uid}`;
  const ref = doc(db, 'users', firebaseUser.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, profilePath);
  }

  const resolvedEmail = sanitizeEmail(
    firebaseUser.email || 'unknown@example.com'
  );
  const resolvedName = sanitizeFullName(
    overrideName ||
      firebaseUser.displayName ||
      resolvedEmail.split('@')[0] ||
      'VoxForge User'
  );

  if (!existingSnap.exists()) {
    try {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        fullName: resolvedName || 'VoxForge User',
        email: resolvedEmail,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, profilePath);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const hadAuthenticatedUserRef = useRef(false);
  const explicitLogoutRef = useRef(false);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        hadAuthenticatedUserRef.current = true;
        explicitLogoutRef.current = false;
        setUser(nextUser);
      } else {
        if (hadAuthenticatedUserRef.current && !explicitLogoutRef.current) {
          setSessionNotice(
            'Your session ended or expired. Please log in again to access your dashboard.'
          );
        }
        hadAuthenticatedUserRef.current = false;
        explicitLogoutRef.current = false;
        setUser(null);
        setProfile(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isFirebaseConfigured) {
      return;
    }

    const profilePath = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({
            uid: typeof data.uid === 'string' ? data.uid : user.uid,
            fullName:
              typeof data.fullName === 'string'
                ? data.fullName
                : user.displayName || 'VoxForge User',
            email:
              typeof data.email === 'string'
                ? data.email
                : user.email || '',
            createdAt: parseCreatedAt(
              data.createdAt,
              user.metadata.creationTime
            ),
          });
        } else {
          setProfile({
            uid: user.uid,
            fullName: user.displayName || 'VoxForge User',
            email: user.email || '',
            createdAt: parseCreatedAt(null, user.metadata.creationTime),
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  const loginWithEmail = useCallback(
    async ({
      email,
      password,
      rememberMe,
    }: {
      email: string;
      password: string;
      rememberMe: boolean;
    }) => {
      if (!isFirebaseConfigured) {
        throw new Error('Firebase configuration is missing.');
      }
      const cleanEmail = sanitizeEmail(email);
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        setSessionNotice(null);
        await ensureUserProfileDoc(cred.user);
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      }
    },
    []
  );

  const registerWithEmail = useCallback(
    async ({
      fullName,
      email,
      password,
    }: {
      fullName: string;
      email: string;
      password: string;
    }): Promise<RegisterResult> => {
      if (!isFirebaseConfigured) {
        throw new Error('Firebase configuration is missing.');
      }
      const cleanName = sanitizeFullName(fullName);
      const cleanEmail = sanitizeEmail(email);

      let cred;
      try {
        await setPersistence(auth, browserLocalPersistence);
        cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      }

      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch {
        // Non-fatal; Firestore profile stores canonical fullName
      }

      await ensureUserProfileDoc(cred.user, cleanName);

      let verificationSent = false;
      try {
        await sendEmailVerification(cred.user);
        verificationSent = true;
      } catch {
        verificationSent = false;
      }

      setSessionNotice(null);
      return { verificationSent };
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Google Sign-In is unavailable until Firebase is configured.');
    }
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithPopup(auth, googleProvider);
      setSessionNotice(null);
      await ensureUserProfileDoc(cred.user);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase configuration is missing.');
    }
    try {
      await sendPasswordResetEmail(auth, sanitizeEmail(email));
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const logout = useCallback(async () => {
    explicitLogoutRef.current = true;
    setSessionNotice(null);
    await signOut(auth);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('No active user session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const refreshAuthUser = useCallback(async () => {
    if (!auth.currentUser) {
      return false;
    }
    try {
      await reload(auth.currentUser);
      await getIdToken(auth.currentUser, true);
      setUser({ ...auth.currentUser } as User);
      return auth.currentUser.emailVerified;
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const updateFullName = useCallback(async (nextName: string) => {
    if (!auth.currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }
    const cleanName = sanitizeFullName(nextName);
    if (cleanName.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    const profilePath = `users/${auth.currentUser.uid}`;
    try {
      await updateProfile(auth.currentUser, { displayName: cleanName });
    } catch {
      // Continue syncing Firestore document
    }

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        fullName: cleanName,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, profilePath);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authReady,
      isConfigured: isFirebaseConfigured,
      sessionNotice,
      clearSessionNotice,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      resetPassword,
      logout,
      resendVerificationEmail,
      refreshAuthUser,
      updateFullName,
    }),
    [
      user,
      profile,
      authReady,
      sessionNotice,
      clearSessionNotice,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      resetPassword,
      logout,
      resendVerificationEmail,
      refreshAuthUser,
      updateFullName,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
