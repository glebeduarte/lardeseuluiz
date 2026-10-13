import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'student';
type UserType = 'frequentador' | 'trabalhador';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  user_type: UserType;
  must_change_password?: boolean;
}

interface SignUpResult {
  error: AuthError | null;
  data: { user: User | null } | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminState, setIsAdminState] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  const touchLastActivity = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', userId);
    } catch {
      // silent — non-critical
    }
  };

  const fetchProfile = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle(),
    ]);

    setProfile(profileRes.data && !profileRes.error ? profileRes.data as Profile : null);
    setIsAdminState(!!roleRes.data && !roleRes.error);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const newUser = session?.user ?? null;
        const prevId = currentUserIdRef.current;
        const sameUser = !!newUser && prevId === newUser.id;
        currentUserIdRef.current = newUser?.id ?? null;
        // Keep the same user reference on token refresh / tab refocus to avoid re-renders/remounts
        setUser((prev) => (prev && newUser && prev.id === newUser.id ? prev : newUser));

        if (newUser) {
          if (sameUser) return; // Token refresh or tab focus: no reload
          setLoading(true);
          setTimeout(async () => {
            try {
              await fetchProfile(newUser.id);
              touchLastActivity(newUser.id);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setIsAdminState(false);
          setLoading(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          touchLastActivity(session.user.id);
        } else {
          setProfile(null);
          setIsAdminState(false);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Check if user is active
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profileData && !profileData.is_active) {
        await supabase.auth.signOut();
        return { error: new Error('Sua conta foi desativada. Entre em contato com a administração.') };
      }
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string): Promise<SignUpResult> => {
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    });
    return { 
      error, 
      data: data ? { user: data.user } : null 
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdminState(false);
  };

  const isAdmin = isAdminState;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
