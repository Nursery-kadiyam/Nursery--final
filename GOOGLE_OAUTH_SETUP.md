# Google OAuth Setup Guide for Supabase

## Prerequisites
- You already have Google Client ID and Client Secret
- Your Supabase project is set up
- Your application is deployed on Vercel

## Step 1: Configure Google OAuth in Supabase Dashboard

### 1.1 Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list of providers

### 1.2 Enable Google Provider
1. **Toggle ON** the Google provider
2. You'll see fields for **Client ID** and **Client Secret**

### 1.3 Add Your Google Credentials
1. **Client ID**: Paste your Google Client ID
2. **Client Secret**: Paste your Google Client Secret
3. **Redirect URL**: This will be automatically set by Supabase, but make sure it matches your domain

### 1.4 Save Configuration
1. Click **Save** to apply the changes
2. The Google provider should now show as **Enabled**

## Step 2: Configure Redirect URLs

### 2.1 In Supabase Dashboard
1. Go to **Authentication** → **URL Configuration**
2. Add your redirect URLs:
   - **Site URL**: `https://your-domain.vercel.app` (replace with your actual domain)
   - **Redirect URLs**: 
     - `https://your-domain.vercel.app/auth/callback`
     - `https://your-domain.vercel.app/**`

### 2.2 In Google Cloud Console
1. Go to your Google Cloud Console project
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add these **Authorized redirect URIs**:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `https://your-domain.vercel.app/auth/callback`

## Step 3: Environment Variables Setup

### 3.1 In Vercel Dashboard
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3.2 In Supabase Dashboard
1. Go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Use these in your Vercel environment variables

## Step 4: Test the Implementation

### 4.1 Local Testing
1. Run your application locally
2. Try clicking the "Continue with Google" button
3. You should be redirected to Google's consent screen
4. After authorization, you should be redirected back to your app

### 4.2 Production Testing
1. Deploy your changes to Vercel
2. Test the Google sign-in on your live domain
3. Verify that users are properly authenticated

## Step 5: Handle User Data

### 5.1 User Profile Creation
The `AuthCallback.tsx` component automatically:
- Creates a user profile in the `user_profiles` table
- Extracts name from Google user metadata
- Handles both new and existing users

### 5.2 User Metadata
Google provides these fields:
- `user.email` - User's email address
- `user.user_metadata.full_name` - User's full name
- `user.user_metadata.avatar_url` - User's profile picture (if available)

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error**
   - Check that your redirect URLs match exactly in both Supabase and Google Console
   - Make sure there are no trailing slashes or typos

2. **"Client ID not found" error**
   - Verify your Google Client ID is correct
   - Make sure the Google OAuth API is enabled in Google Cloud Console

3. **"Redirect URI mismatch" error**
   - Double-check all redirect URLs in both Supabase and Google Console
   - Ensure your domain is correct

4. **User profile not created**
   - Check the browser console for errors
   - Verify your `user_profiles` table has the correct RLS policies

### Debug Steps:
1. Check browser console for errors
2. Verify Supabase logs in the dashboard
3. Test with a different Google account
4. Check network tab for failed requests

## Security Considerations

1. **Environment Variables**: Never commit your client secret to version control
2. **HTTPS Only**: OAuth requires HTTPS in production
3. **Domain Verification**: Ensure your domain is verified in Google Console
4. **Rate Limiting**: Be aware of Google's rate limits

## Next Steps

After successful implementation:
1. Test with multiple Google accounts
2. Verify user data is properly stored
3. Test the complete user flow (sign up → dashboard)
4. Monitor for any authentication errors
5. Consider adding additional OAuth providers if needed

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth/social-login/auth-google
2. Check Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
3. Review your browser's network tab for failed requests
4. Check Supabase logs in the dashboard
