import React from 'react';
import { RegisterForm } from '../components/RegisterForm';
import { UserProfile } from '../lib/auth';

const RegisterPage: React.FC = () => {
  const handleRegistrationSuccess = (user: any, profile: UserProfile) => {
    console.log('Registration successful!');
    console.log('User:', user);
    console.log('Profile:', profile);
    
    // You can redirect the user, show a success message, etc.
    alert(`Welcome ${profile.first_name}! Please check your email to confirm your account.`);
  };

  const handleRegistrationError = (error: string) => {
    console.error('Registration error:', error);
    // You can show a toast notification, log to analytics, etc.
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Join Our Platform
          </h1>
          <p className="mt-2 text-gray-600">
            Create your account to get started
          </p>
        </div>

        <RegisterForm
          onSuccess={handleRegistrationSuccess}
          onError={handleRegistrationError}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
