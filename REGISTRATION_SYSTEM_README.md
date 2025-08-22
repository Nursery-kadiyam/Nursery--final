# 🔐 Complete Registration System with Supabase

This registration system creates users in Supabase Auth and saves their profile data to a `user_profiles` table with proper Row Level Security (RLS) policies.

## 📋 Table of Contents

- [Features](#features)
- [Database Setup](#database-setup)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ **Supabase Auth Integration**: Creates users in Supabase Authentication
- ✅ **Profile Data Storage**: Saves user data to `user_profiles` table
- ✅ **Row Level Security**: Users can only access their own profile data
- ✅ **TypeScript Support**: Full type safety with interfaces
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Form Validation**: Client-side validation with helpful error messages
- ✅ **Loading States**: Proper loading states during registration
- ✅ **Email Confirmation**: Handles email confirmation workflow

## 🗄️ Database Setup

### 1. Run the SQL Script

Execute the `setup_user_profiles_table.sql` script in your Supabase SQL Editor:

```sql
-- This creates the user_profiles table with proper structure and RLS policies
-- Run this in your Supabase SQL Editor
```

### 2. Table Structure

The `user_profiles` table has the following structure:

```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. RLS Policies

The system includes these Row Level Security policies:

- **SELECT**: Users can view their own profile
- **INSERT**: Users can insert their own profile
- **UPDATE**: Users can update their own profile
- **DELETE**: Users can delete their own profile

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Configure Supabase

Make sure your `src/lib/supabase.ts` file is properly configured:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 3. Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📖 Usage

### 1. Basic Registration Form

```tsx
import { RegisterForm } from './components/RegisterForm';

function App() {
  const handleSuccess = (user: any, profile: any) => {
    console.log('Registration successful!', { user, profile });
    // Redirect or show success message
  };

  const handleError = (error: string) => {
    console.error('Registration failed:', error);
    // Show error message
  };

  return (
    <RegisterForm
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### 2. Using the registerUser Function Directly

```typescript
import { registerUser } from './lib/auth';

const formData = {
  email: 'user@example.com',
  password: 'securepassword123',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  address: '123 Main St, City, State'
};

const result = await registerUser(formData);

if (result.success) {
  console.log('User created:', result.user);
  console.log('Profile created:', result.profile);
} else {
  console.error('Registration failed:', result.error);
}
```

### 3. Getting User Profile

```typescript
import { getCurrentUserProfile } from './lib/auth';

const profile = await getCurrentUserProfile();
if (profile) {
  console.log('User profile:', profile);
}
```

### 4. Updating User Profile

```typescript
import { updateUserProfile } from './lib/auth';

const success = await updateUserProfile({
  first_name: 'Jane',
  phone: '+1987654321'
});

if (success) {
  console.log('Profile updated successfully');
}
```

## 🔧 API Reference

### registerUser(formData: RegisterFormData): Promise<RegisterResult>

Registers a new user and creates their profile.

**Parameters:**
- `formData`: Object containing user registration data

**Returns:**
- `success`: Boolean indicating if registration was successful
- `user`: Supabase Auth user object (if successful)
- `profile`: User profile object (if successful)
- `error`: Error message (if failed)
- `errorCode`: Error code (if failed)

### getCurrentUserProfile(): Promise<UserProfile | null>

Gets the current authenticated user's profile.

**Returns:**
- User profile object or null if not found/authenticated

### updateUserProfile(updates: Partial<UserProfile>): Promise<boolean>

Updates the current user's profile.

**Parameters:**
- `updates`: Object containing fields to update

**Returns:**
- Boolean indicating if update was successful

### isAuthenticated(): Promise<boolean>

Checks if the current user is authenticated.

**Returns:**
- Boolean indicating authentication status

### signOut(): Promise<void>

Signs out the current user.

## 🔒 Security Features

### Row Level Security (RLS)

The system implements RLS policies that ensure:

- Users can only view their own profile
- Users can only update their own profile
- Users can only delete their own profile
- Users can only insert their own profile

### Data Validation

- Client-side form validation
- Server-side validation through Supabase
- Email format validation
- Password strength requirements

### Error Handling

- Comprehensive error handling for all operations
- User-friendly error messages
- Detailed logging for debugging

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Profile creation failed" Error

**Cause**: RLS policies blocking the insert operation
**Solution**: Ensure the user is authenticated and the RLS policies are correctly set up

#### 2. "User not found" Error

**Cause**: User not properly authenticated
**Solution**: Check if the user is signed in before accessing profile data

#### 3. Email Confirmation Issues

**Cause**: Email confirmation required but not completed
**Solution**: Check Supabase Auth settings and ensure email confirmation is properly configured

#### 4. RLS Policy Errors

**Cause**: Incorrect RLS policy configuration
**Solution**: Run the setup SQL script again to ensure proper policy creation

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` to see:

- Form data in the UI
- Detailed console logs
- Error details

### Checking Database

To verify data is being saved correctly:

1. Go to Supabase Dashboard
2. Check Authentication > Users for auth users
3. Check Table Editor > user_profiles for profile data

## 📝 Example Implementation

See `src/pages/RegisterPage.tsx` for a complete example of how to use the registration system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
