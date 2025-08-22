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

          // Step 2: Check both user_profiles (for normal users) and merchants table (for merchants)
          let profile = null;
          let error = null;
          let userRole = null;
          
          // First, check if user is a merchant
          const { data: merchantData, error: merchantError } = await supabase
            .from("merchants")
            .select("status, user_id")
            .eq("email", currentUser.email)
            .maybeSingle();
          
          if (merchantData) {
            console.log('Found merchant record:', merchantData);
            userRole = 'merchant';
            profile = { role: 'merchant', id: currentUser.id };
          } else {
            // If not a merchant, check user_profiles for normal users
            const { data: profileByEmail, error: emailError } = await supabase
              .from("user_profiles")
              .select("role, id")
              .eq("email", currentUser.email)
              .maybeSingle();
            
            if (profileByEmail) { 
              profile = profileByEmail; 
              userRole = profileByEmail.role;
              console.log('Found user profile by email:', profile); 
            } else {
              // Try by id as fallback
              const { data: profileById, error: idError } = await supabase
                .from("user_profiles")
                .select("role, id")
                .eq("id", currentUser.id)
                .maybeSingle();
              
              if (profileById) { 
                profile = profileById; 
                userRole = profileById.role;
                console.log('Found user profile by id:', profile); 
              } else { 
                error = idError; 
                console.log('No profile found in user_profiles or merchants table'); 
                console.log('Errors - Merchant:', merchantError, 'Email:', emailError, 'ID:', idError);
              }
            }
          }

          if (error || !profile) { 
            console.error('Error fetching user profile:', error); 
            return; 
          }
          console.log('User role:', profile.role);

          // Step 3: Redirect based on role (using improved role checking)
          if (userRole) {
            const roleLower = userRole.toLowerCase().trim();
            console.log('AdminAutoRedirect: Role after lowercase and trim:', JSON.stringify(roleLower));
            
            if (roleLower === 'admin') {
              if (location.pathname !== '/admin-dashboard') {
                console.log('Admin user - redirecting to admin dashboard');
                navigate('/admin-dashboard');
                setHasRedirected(true);
              }
            } else if (roleLower === 'merchant') {
              if (location.pathname !== '/merchant-dashboard') {
                console.log('Merchant user - redirecting to merchant dashboard');
                navigate('/merchant-dashboard');
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
