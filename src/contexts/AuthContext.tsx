import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
                setUser(initialSession?.user ?? null);
            } catch (error) {
                console.error('Error getting initial session:', error);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setSession(newSession);
                setUser(newSession?.user ?? null);
                setLoading(false);

                // Dispatch custom events for backward compatibility
                if (event === 'SIGNED_IN' && newSession?.user) {
                    window.dispatchEvent(new CustomEvent('user-logged-in', {
                        detail: { user: newSession.user, session: newSession }
                    }));
                } else if (event === 'SIGNED_OUT') {
                    window.dispatchEvent(new CustomEvent('user-logged-out'));
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            // Clear any additional localStorage items
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_session');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const signInWithGoogle = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                console.error('Google sign-in error:', error);
                throw error;
            }

            console.log('Google sign-in initiated:', data);
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const value = {
        user,
        session,
        loading,
        signOut,
        signInWithGoogle,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 