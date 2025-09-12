import { supabase } from './supabase';

// Type definitions
export interface RegisterFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterResult {
  success: boolean;
  user?: any;
  profile?: UserProfile;
  error?: string;
  errorCode?: string;
}

/**
 * Register a new user with Supabase Auth and create user profile
 * @param formData - Registration form data
 * @returns Promise<RegisterResult>
 */
export async function registerUser(formData: RegisterFormData): Promise<RegisterResult> {
  try {
    console.log('=== REGISTRATION START ===');
    console.log('Form data:', { ...formData, password: '[HIDDEN]' });

    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return {
        success: false,
        error: authError.message,
        errorCode: authError.name
      };
    }

    if (!authData.user) {
      console.error('No user returned from signup');
      return {
        success: false,
        error: 'No user created during signup'
      };
    }

    console.log('✅ User created in Supabase Auth:', authData.user.id);

    // Step 2: Create user profile in user_profiles table
    console.log('Step 2: Creating user profile...');
    const profileData = {
      id: authData.user.id, // Use 'id' to match table structure
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone || null,
      address: formData.address || null
    };

    console.log('Profile data to insert:', profileData);

    const { data: profileInsertData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Error details:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });
      
      // If profile creation fails, we should clean up the auth user
      // But for now, we'll return the error and let the user try again
      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`,
        errorCode: profileError.code
      };
    }

    console.log('✅ User profile created successfully:', profileInsertData);

    // Step 3: Verify the profile was created
    console.log('Step 3: Verifying profile creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (verifyError || !verifyData) {
      console.error('Profile verification failed:', verifyError);
      return {
        success: false,
        error: 'Profile verification failed after creation'
      };
    }

    console.log('✅ Profile verification successful:', verifyData);

    // Step 4: Check email confirmation status
    if (authData.user.email_confirmed_at === null) {
      console.log('⚠️ Email confirmation required');
    } else {
      console.log('✅ Email already confirmed');
    }

    console.log('=== REGISTRATION COMPLETE ===');

    return {
      success: true,
      user: authData.user,
      profile: verifyData as UserProfile
    };

  } catch (error) {
    console.error('Unexpected error during registration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Get current user's profile
 * @returns Promise<UserProfile | null>
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // First check if user is a merchant
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('email', user.email)
      .single();

    if (merchantData && !merchantError) {
      // User is a merchant, return merchant profile data as UserProfile
      return {
        id: user.id,
        first_name: merchantData.full_name?.split(' ')[0] || merchantData.full_name || '',
        last_name: merchantData.full_name?.split(' ').slice(1).join(' ') || '',
        email: merchantData.email,
        phone: merchantData.phone_number,
        role: 'merchant',
        created_at: merchantData.created_at,
        updated_at: merchantData.updated_at
      } as UserProfile;
    }

    // If not a merchant, check user_profiles table
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile as UserProfile;
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 * @param updates - Profile fields to update
 * @returns Promise<boolean>
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Sign out current user
 * @returns Promise<void>
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  } catch (error) {
    console.error('Error during sign out:', error);
  }
}
