import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { isCurrentUserAdmin } from "../lib/dataAccess";
import {
  mergeGuestPreferencesIntoAccount,
  resetPreferenceSession,
  setActivePreferenceUser,
} from "../lib/filterPreferences";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshAdminStatus: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdmin = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser || !isSupabaseConfigured || !supabase) {
      return false;
    }
    try {
      const result = await isCurrentUserAdmin();
      return result.data === true;
    } catch {
      return false;
    }
  }, []);

  const refreshAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const currentUser = userRes?.user || null;
    setUser(currentUser);
    const adminStatus = await checkAdmin(currentUser);
    setIsAdmin(adminStatus);
    return adminStatus;
  }, [checkAdmin]);

  const signOut = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue clearing local auth state
      }
    }
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setLoading(false);
    // Forget whose preferences are in memory so the next reader of this browser
    // starts from guest storage, never from the previous account.
    resetPreferenceSession();
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial session & user check using supabase.auth.getUser()
    async function initAuth() {
      try {
        const { data: userRes, error: userErr } = await supabase!.auth.getUser();
        if (userErr || !userRes?.user) {
          setActivePreferenceUser(null);
          if (isMounted) {
            setUser(null);
            setSession(null);
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const currentUser = userRes.user;
        const { data: sessionRes } = await supabase!.auth.getSession();
        const adminStatus = await checkAdmin(currentUser);
        // Declare the identity before anything reads or writes preferences, so
        // the store can reject work that belongs to a previous viewer.
        setActivePreferenceUser(currentUser.id);
        // A restored session never fires SIGNED_IN in every client version, so
        // the merge is attempted here too. It is guarded per user id, so the
        // duplicate attempt is a no-op rather than a second write.
        void mergeGuestPreferencesIntoAccount(currentUser.id);

        if (isMounted) {
          setUser(currentUser);
          setSession(sessionRes?.session || null);
          setIsAdmin(adminStatus);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      if (!nextSession?.user) {
        setActivePreferenceUser(null);
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setLoading(false);
        if (event === "SIGNED_OUT") resetPreferenceSession();
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);
      setActivePreferenceUser(nextSession.user.id);
      // Sign-in and token refresh both land here. The merge runs once per user
      // id, so a refresh can never overwrite the account row again.
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void mergeGuestPreferencesIntoAccount(nextSession.user.id);
      }
      const adminStatus = await checkAdmin(nextSession.user);
      if (isMounted) {
        setIsAdmin(adminStatus);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [checkAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        loading,
        signOut,
        refreshAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
