import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AdminTest = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        return;
      }

      setUser(user);
      console.log('Current user:', user);

      if (user) {
        // Try to get profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', user.email)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
        } else {
          setProfile(profileData);
          console.log('Profile data:', profileData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const forceAdminAccess = () => {
    console.log('Forcing admin access...');
    navigate('/admin-dashboard');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Admin Test Panel</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>User Info:</h3>
        <p><strong>Email:</strong> {user?.email || 'No user'}</p>
        <p><strong>User ID:</strong> {user?.id || 'No ID'}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
        <h3>Profile Info:</h3>
        <p><strong>Profile ID:</strong> {profile?.id || 'No profile'}</p>
        <p><strong>Profile User ID:</strong> {profile?.user_id || 'No user_id'}</p>
        <p><strong>Role:</strong> {profile?.role || 'No role'}</p>
        <p><strong>Is Admin:</strong> {profile?.role === 'admin' ? '✅ YES' : '❌ NO'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={forceAdminAccess}
          style={{
            padding: '15px 30px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🚀 Force Admin Access
        </button>

        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '15px 30px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🏠 Go Home
        </button>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
        <h3>🔍 Debug Info:</h3>
        <p>If "Is Admin" shows ❌ NO, run the SQL script again.</p>
        <p>If "Force Admin Access" works, the issue is in role checking logic.</p>
        <p>Check browser console for any errors.</p>
      </div>
    </div>
  );
};

export default AdminTest;
