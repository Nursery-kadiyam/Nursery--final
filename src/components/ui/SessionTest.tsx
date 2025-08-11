import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const SessionTest: React.FC = () => {
    const { user, session, loading } = useAuth();

    const checkLocalStorage = () => {
        const authKey = 'kadiyam-nursery-auth';
        const authData = localStorage.getItem(authKey);
        return authData ? JSON.parse(authData) : null;
    };

    const getSessionInfo = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        return currentSession;
    };

    return (
        <div className="p-4 bg-gray-100 rounded-lg m-4">
            <h3 className="text-lg font-bold mb-4">Session Persistence Test</h3>

            <div className="space-y-2">
                <div>
                    <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
                </div>

                <div>
                    <strong>User:</strong> {user ? user.email : 'None'}
                </div>

                <div>
                    <strong>Session:</strong> {session ? 'Active' : 'None'}
                </div>

                <div>
                    <strong>Session Expires:</strong> {session ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}
                </div>

                <div>
                    <strong>LocalStorage Auth Key:</strong> {checkLocalStorage() ? 'Present' : 'Not Found'}
                </div>
            </div>

            <button
                onClick={async () => {
                    const sessionInfo = await getSessionInfo();
                    console.log('Current session:', sessionInfo);
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
                Check Session in Console
            </button>
        </div>
    );
};

export default SessionTest; 