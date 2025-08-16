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

          // Step 2: Fetch role from user_profiles - try email first, then user_id, then id
          let profile = null;
          let error = null;
          
          // Try by email first (most reliable)
          const { data: profileByEmail, error: emailError } = await supabase
            .from("user_profiles")
            .select("role, id, user_id")
            .eq("email", currentUser.email)
            .maybeSingle();
          
          if (profileByEmail) { 
            profile = profileByEmail; 
            console.log('Found profile by email:', profile); 
          } else {
            // Try by user_id
            const { data: profileByUserId, error: userIdError } = await supabase
              .from("user_profiles")
              .select("role, id, user_id")
              .eq("user_id", currentUser.id)
              .maybeSingle();
            
            if (profileByUserId) { 
              profile = profileByUserId; 
              console.log('Found profile by user_id:', profile); 
            } else {
              // Try by id as fallback
              const { data: profileById, error: idError } = await supabase
                .from("user_profiles")
                .select("role, id, user_id")
                .eq("id", currentUser.id)
                .maybeSingle();
              
              if (profileById) { 
                profile = profileById; 
                console.log('Found profile by id:', profile); 
              } else { 
                error = idError; 
                console.log('No profile found with email, user_id, or id'); 
                console.log('Errors - Email:', emailError, 'UserID:', userIdError, 'ID:', idError);
              }
            }
          }

          if (error || !profile) { 
            console.error('Error fetching user profile:', error); 
            return; 
          }
          console.log('User role:', profile.role);

          // Step 3: Redirect based on role (using improved role checking)
          if (profile.role) {
            const roleLower = profile.role.toLowerCase().trim();
            console.log('AdminAutoRedirect: Role after lowercase and trim:', JSON.stringify(roleLower));
            
            if (roleLower === 'admin') {
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
