import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Auth callback error:', error);
                    setError('Authentication failed. Please try again.');
                    setLoading(false);
                    return;
                }

                if (data.session) {
                    console.log('User authenticated successfully:', data.session.user);
                    
                    // Check if user profile exists, if not create one
                    const { data: profileData, error: profileError } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', data.session.user.id)
                        .single();

                    if (profileError && profileError.code === 'PGRST116') {
                        // Profile doesn't exist, create one
                        const { error: insertError } = await supabase
                            .from('user_profiles')
                            .insert([
                                {
                                    id: data.session.user.id,
                                    email: data.session.user.email,
                                    first_name: data.session.user.user_metadata?.full_name?.split(' ')[0] || '',
                                    last_name: data.session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                                    created_at: new Date().toISOString()
                                }
                            ]);

                        if (insertError) {
                            console.error('Error creating user profile:', insertError);
                        } else {
                            console.log('User profile created successfully');
                        }
                    }

                    // Redirect to dashboard or home page
                    navigate('/');
                } else {
                    console.log('No session found, redirecting to login');
                    navigate('/');
                }
            } catch (err) {
                console.error('Unexpected error in auth callback:', err);
                setError('An unexpected error occurred. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        handleAuthCallback();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Completing Sign In...</h2>
                    <p className="text-gray-500">Please wait while we set up your account.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Failed</h2>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        Go Back Home
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default AuthCallback;
