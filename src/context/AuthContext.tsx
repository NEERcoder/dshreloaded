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
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;

      if (!nextSession?.user) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);
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
