import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const DebugAdmin: React.FC = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const debugAdminAccess = async () => {
      if (!user) {
        setDebugInfo({ error: 'No user logged in' });
        return;
      }

      console.log('=== DEBUG ADMIN ACCESS ===');
      console.log('User:', user);
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);

      try {
        // Try to get user profile with user_id
        const { data: profile1, error: error1 } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('Profile with user_id:', profile1);
        console.log('Error with user_id:', error1);

        // Try to get user profile with id
        const { data: profile2, error: error2 } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Profile with id:', profile2);
        console.log('Error with id:', error2);

        // Get all profiles for this user
        const { data: allProfiles, error: error3 } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`user_id.eq.${user.id},id.eq.${user.id}`);

        console.log('All profiles for user:', allProfiles);
        console.log('Error getting all profiles:', error3);

        setDebugInfo({
          user: {
            id: user.id,
            email: user.email
          },
          profileWithUserId: profile1,
          profileWithId: profile2,
          allProfiles: allProfiles,
          errors: {
            user_id: error1,
            id: error2,
            all: error3
          }
        });

      } catch (error) {
        console.error('Debug error:', error);
        setDebugInfo({ error: error });
      }
    };

    debugAdminAccess();
  }, [user]);

  if (!user) {
    return <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">No user logged in</div>;
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded m-4">
      <h3 className="font-bold mb-2">Debug Admin Access</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default DebugAdmin;
