import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const AdminAutoRedirect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user && !hasRedirected) {
        console.log('Checking user role for:', user.email);
        console.log('User ID:', user.id);
        
        try {
          // Step 1: Get current user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) { 
            console.log('No authenticated user found'); 
            return; 
          }
          console.log('Current user ID:', currentUser.id);

          // Step 2: Fetch role from user_profiles - try both user_id and id columns
          let profile = null;
          let error = null;
          const { data: profile1, error: error1 } = await supabase
            .from("user_profiles")
            .select("role, id, user_id")
            .eq("user_id", currentUser.id)
            .maybeSingle();
          
          if (profile1) { 
            profile = profile1; 
            console.log('Found profile with user_id:', profile); 
          } else {
            const { data: profile2, error: error2 } = await supabase
              .from("user_profiles")
              .select("role, id, user_id")
              .eq("id", currentUser.id)
              .maybeSingle();
            if (profile2) { 
              profile = profile2; 
              console.log('Found profile with id:', profile); 
            } else { 
              error = error2; 
              console.log('No profile found with either user_id or id'); 
            }
          }

          if (error || !profile) { 
            console.error('Error fetching user profile:', error); 
            return; 
          }
          console.log('User role:', profile.role);

          // Step 3: Redirect based on role
          if (profile.role === "admin" || profile.role === "ADMIN" || profile.role === "Admin") {
            if (location.pathname !== '/admin-dashboard') {
              console.log('Admin user - redirecting to admin dashboard');
              navigate('/admin-dashboard');
              setHasRedirected(true);
            }
          } else {
            if (location.pathname === '/admin-dashboard') {
              console.log('Regular user - redirecting away from admin dashboard');
              navigate('/');
              setHasRedirected(true);
            }
          }
        } catch (error) {
          console.error('Error in role-based redirect:', error);
        }
      }
    };

    checkAndRedirect();
  }, [user, navigate, location.pathname, hasRedirected]);

  // Reset redirect flag when user changes
  useEffect(() => {
    setHasRedirected(false);
  }, [user]);

  return null; // This component doesn't render anything
};

export default AdminAutoRedirect;
