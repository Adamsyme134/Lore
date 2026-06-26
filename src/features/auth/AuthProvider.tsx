import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { Profile } from "../../shared/types/domain";
import * as Linking from "expo-linking";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isBackendReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string, handle: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    handle: row.handle ?? "new-user",
    fullName: row.full_name ?? "New explorer",
    avatarUrl: row.avatar_url ?? null,
    homeCity: row.home_city ?? null,
    pointsTotal: row.points_total ?? 0
  };
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    const { data: currentSession } = await supabase.auth.getSession();
    const userId = currentSession.session?.user.id;

    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, home_city, points_total")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(mapProfile(data));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabase) {
        if (mounted) {
          setSession(null);
          setIsLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    }

    void loadSession();

    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void refreshProfile();
    }
  }, [isLoading, session?.user.id, refreshProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured yet.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string, handle: string) => {
    if (!supabase) throw new Error("Supabase is not configured yet.");
    const cleanedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    
    const redirectUrl = Linking.createURL("/(app)/(tabs)/today");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          emailRedirectTo: redirectUrl,
          full_name: fullName.trim(),
          handle: cleanedHandle
        }
      }
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    isLoading,
    isBackendReady: isSupabaseConfigured,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile
  }), [isLoading, profile, refreshProfile, session, signInWithEmail, signOut, signUpWithEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}