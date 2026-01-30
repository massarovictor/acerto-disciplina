import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { supabase } from '@/services/supabase';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, authUser: SupabaseUser | null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return;
    }

    if (!data) {
      const fallbackName =
        typeof authUser?.user_metadata?.name === 'string'
          ? authUser.user_metadata.name
          : authUser?.email?.split('@')[0] ?? 'Usuario';
      const fallbackRole =
        typeof authUser?.user_metadata?.role === 'string'
          ? authUser.user_metadata.role
          : 'diretor';
      setProfile({
        id: userId,
        name: fallbackName,
        email: authUser?.email ?? '',
        role: fallbackRole as UserRole,
      });
      return;
    }

    setProfile({
      id: data.id,
      name: data.name,
      email: authUser?.email ?? '',
      role: (data.role as UserRole) ?? 'diretor',
    });
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          await fetchProfile(data.session.user.id, data.session.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        // We don't block for profile update on subsequent events, just update it
        fetchProfile(nextUser.id, nextUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
