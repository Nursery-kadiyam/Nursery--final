import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showLoginPopup?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback, 
  redirectTo = '/', 
  showLoginPopup = true 
}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // If user is not authenticated
  if (!user) {
    if (showLoginPopup) {
      // Dispatch event to open login popup
      window.dispatchEvent(new CustomEvent('open-login-popup'));
      toast({
        title: "Login Required",
        description: "Please login to access this feature.",
        variant: "destructive"
      });
    } else if (redirectTo) {
      navigate(redirectTo);
    }

    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Login Required</h3>
          <p className="text-gray-500 mb-4">Please login to access this feature.</p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-popup'))}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
};

export default AuthGuard;