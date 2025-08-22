import * as React from "react"
import { Mail, Lock, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import GoogleLoginButton from "./GoogleLoginButton"

interface LoginPopupProps {
    isOpen: boolean
    onClose: () => void
}

const LoginPopup: React.FC<LoginPopupProps> = ({ isOpen, onClose }) => {
    const [isRegisterMode, setIsRegisterMode] = React.useState(false)
    const { user } = useAuth()

    // Login state
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")

    // Register state
    const [firstName, setFirstName] = React.useState("")
    const [lastName, setLastName] = React.useState("")
    const [registerEmail, setRegisterEmail] = React.useState("")
    const [phone, setPhone] = React.useState("")
    const [address, setAddress] = React.useState("")
    const [createPassword, setCreatePassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")

    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [registrationSent, setRegistrationSent] = React.useState(false)
    const [forgotPasswordMode, setForgotPasswordMode] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            setIsRegisterMode(false)
            setEmail("")
            setPassword("")
            setFirstName("")
            setLastName("")
            setRegisterEmail("")
            setPhone("")
            setAddress("")
            setCreatePassword("")
            setConfirmPassword("")
            setError(null)
            setSuccess(null)
            setLoading(false)
            setRegistrationSent(false)
            setForgotPasswordMode(false)
        }
    }, [isOpen])

    // Close popup if user is already logged in
    React.useEffect(() => {
        if (user && isOpen) {
            onClose()
        }
    }, [user, isOpen, onClose])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        // Frontend validation
        if (!email || !password) {
            setError("Email and password are required.")
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Please enter a valid email address.")
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            console.log('Attempting login for:', email)

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                console.error('Login error details:', error)

                if (error.message.includes('Invalid login credentials')) {
                    setError("Incorrect email or password. Please try again.")
                } else if (error.message.includes('Email not confirmed')) {
                    setError("Please check your email and click the confirmation link before signing in.")
                } else {
                    setError("An unexpected error occurred. Please try again.")
                }
                setLoading(false)
                return
            }

            // Check if we have both session and user
            if (!data.session) {
                console.error('No session returned from login')
                setError("Login was successful but no session was created. Please try again.")
                setLoading(false)
                return
            }

            if (!data.user) {
                console.error('No user returned from login')
                setError("Login was successful but user data is missing. Please try again.")
                setLoading(false)
                return
            }

            // Log successful login details
            console.log('Login successful:', {
                userId: data.user.id,
                email: data.user.email,
                emailConfirmed: data.user.email_confirmed_at,
                sessionExpiresAt: data.session.expires_at
            })

            // Check if user is confirmed
            if (!data.user.email_confirmed_at) {
                setError("Please check your email and click the confirmation link before signing in. If you haven't received the email, check your spam folder or contact support.")
                setLoading(false)
                return
            }

            setSuccess("Login successful! Welcome back!")

            // After successful login, update missing profile fields if needed
            try {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('first_name, last_name, phone')
                    .eq('id', data.user.id)
                    .maybeSingle();
                
                // If profile doesn't exist, create it from user metadata
                if (!profile) {
                    console.log('Profile not found, creating from user metadata');
                    const profileData = {
                        id: data.user.id,
                        first_name: data.user.user_metadata?.first_name || '',
                        last_name: data.user.user_metadata?.last_name || '',
                        email: data.user.email,
                        phone: data.user.user_metadata?.phone || null,
                        address: data.user.user_metadata?.address || null
                    };
                    
                    const { error: createError } = await supabase
                        .from('user_profiles')
                        .insert([profileData]);
                    
                    if (createError) {
                        console.error('Error creating profile from metadata:', createError);
                    } else {
                        console.log('Profile created from user metadata successfully');
                    }
                } else if (!profile.first_name || !profile.last_name || !profile.phone) {
                    // Update missing fields from user_metadata
                    const updates: { first_name?: string; last_name?: string; phone?: string } = {};
                    if (!profile.first_name && data.user.user_metadata?.first_name) updates.first_name = data.user.user_metadata.first_name;
                    if (!profile.last_name && data.user.user_metadata?.last_name) updates.last_name = data.user.user_metadata.last_name;
                    if (!profile.phone && data.user.user_metadata?.phone) updates.phone = data.user.user_metadata.phone;
                    
                    if (Object.keys(updates).length > 0) {
                        console.log('Updating missing profile fields after login:', updates);
                        await supabase
                            .from('user_profiles')
                            .update(updates)
                            .eq('id', data.user.id);
                    }
                }
            } catch (err) {
                console.error('Error updating missing profile fields after login:', err);
            }

            // Role-based redirect
            try {
                // Check admin role first
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                if (profile && profile.role === 'admin') {
                    window.location.href = '/admin-dashboard';
                    return;
                }
                // Check if user is an approved merchant
                const { data: merchant, error: merchantError } = await supabase
                    .from('merchants')
                    .select('status')
                    .eq('email', data.user.email)
                    .maybeSingle();
                if (merchant && merchant.status === 'approved') {
                    window.location.href = '/merchant-dashboard';
                    return;
                }
                // Default: go to home
                window.location.href = '/home';
                return;
            } catch (err) {
                // fallback: just close modal
            }

            setTimeout(() => {
                onClose()
            }, 800)

        } catch (err: any) {
            console.error('Unexpected login error:', err)
            setError("Something went wrong. Please try again in a moment.")
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        setError("");
        setLoading(true);

        // Basic validation
        if (!firstName.trim()) {
            setError("First name is required.");
            setLoading(false);
            return;
        }
        if (!lastName.trim()) {
            setError("Last name is required.");
            setLoading(false);
            return;
        }
        // Add email validation before attempting registration
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registerEmail)) {
            setError("Please enter a valid email address.");
            setLoading(false);
            return;
        }

        // Check for common email providers that might be blocked
        const blockedDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
        const emailDomain = registerEmail.split('@')[1]?.toLowerCase();
        if (blockedDomains.includes(emailDomain)) {
            setError("Please use a valid email address from a recognized email provider.");
            setLoading(false);
            return;
        }

        // Temporary workaround for testing - suggest using a different email domain
        if (emailDomain === 'gmail.com' && registerEmail.toLowerCase().includes('nani')) {
            console.warn('Detected test email with "nani" - suggesting alternative');
            setError("For testing, please try using a different email address (e.g., test@outlook.com or your actual email).");
            setLoading(false);
            return;
        }

        if (createPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }
        if (createPassword !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            console.log('=== REGISTRATION DEBUG START ===');
            console.log('Starting registration for:', registerEmail);
            console.log('Form data:', {
                email: registerEmail,
                password: createPassword,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                address: address
            });

            // Step 1: Create user account with Supabase Auth
            console.log('=== STEP 1: SUPABASE AUTH SIGNUP ===');
            console.log('Attempting to create user with email:', registerEmail);
            console.log('SignUp parameters:', {
                email: registerEmail,
                password: createPassword
            });
            
            const signUpStartTime = Date.now();
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: registerEmail,
                password: createPassword,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        phone: phone,
                        address: address
                    }
                }
            });
            const signUpEndTime = Date.now();
            console.log(`SignUp completed in ${signUpEndTime - signUpStartTime}ms`);

            if (authError) {
                console.error('=== AUTH ERROR DETAILS ===');
                console.error('Registration error details:', {
                    message: authError.message,
                    status: authError.status,
                    name: authError.name,
                    stack: authError.stack
                });
                console.error('Full authError object:', authError);
                console.error('AuthError message:', authError.message);
                console.error('AuthError status:', authError.status);
                console.error('AuthError name:', authError.name);
                console.error('AuthError stack:', authError.stack);
                
                // Log additional error properties
                console.error('=== ADDITIONAL ERROR PROPERTIES ===');
                for (const key in authError) {
                    console.error(`${key}:`, authError[key]);
                }
                
                // Enhanced error handling for email validation issues
                if (authError.message.includes("rate limit")) {
                    setError("Too many attempts. Please wait a few minutes before trying again.");
                } else if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
                    setError("This email is already registered. Please try logging in.");
                } else if (authError.message.includes("Database error")) {
                    setError("Database configuration issue. Please contact support.");
                } else if (authError.message.includes("invalid") && authError.message.includes("email")) {
                    setError("Please use a valid email address from a recognized provider (Gmail, Yahoo, Outlook, etc.).");
                } else if (authError.status === 500) {
                    setError("Server error during registration. Please try again or contact support.");
                } else {
                                    setError(`Registration failed: ${authError.message}`);
            }
            setLoading(false);
            return;
            }

            if (!authData.user) {
                console.error('=== NO USER RETURNED ===');
                console.error('No user returned from signup');
                console.error('authData:', authData);
                setError("Registration failed: No user created. Please try again.");
                setLoading(false);
                return;
            }

            console.log('=== USER CREATED SUCCESSFULLY ===');
            console.log('User created successfully in Supabase Auth:', authData.user.id);
            console.log('User data:', authData.user);
            console.log('Session data:', authData.session);
            
            // Check if user confirmation is required
            if (authData.user.email_confirmed_at === null) {
                console.log('=== EMAIL CONFIRMATION REQUIRED ===');
                console.log('User needs to confirm email before appearing in auth.users');
            } else {
                console.log('=== EMAIL ALREADY CONFIRMED ===');
                console.log('User should appear in Authentication > Users immediately');
            }

            // Step 2: Create user profile in database
            console.log('=== STEP 2: CREATE USER PROFILE ===');
            try {
                const profileData = {
                    id: authData.user.id, // Use 'id' instead of 'user_id' to match table structure
                    first_name: firstName,
                    last_name: lastName,
                    email: registerEmail,
                    phone: phone || null,
                    address: address || null
                };
                
                console.log('Profile data to insert:', profileData);
                console.log('Attempting to insert profile into user_profiles table...');
                
                const profileStartTime = Date.now();
                const { data: profileInsertData, error: profileError } = await supabase
                    .from('user_profiles')
                    .insert([profileData])
                    .select(); // Add select() to get the inserted data back
                const profileEndTime = Date.now();
                console.log(`Profile creation completed in ${profileEndTime - profileStartTime}ms`);
                    
                if (profileError) {
                    console.error('=== PROFILE CREATION ERROR ===');
                    console.error('Profile creation error:', profileError);
                    console.error('Profile error details:', {
                        message: profileError.message,
                        details: profileError.details,
                        hint: profileError.hint,
                        code: profileError.code
                    });
                    
                    // Try to get more information about the error
                    if (profileError.code === '23505') {
                        console.error('Duplicate key error - profile might already exist');
                    } else if (profileError.code === '42501') {
                        console.error('Permission denied - RLS might be blocking the insert');
                    } else if (profileError.code === '42P01') {
                        console.error('Table does not exist - user_profiles table missing');
                    }
                    
                    // Don't fail registration if profile creation fails
                    // The user can still log in and we can create profile later
                } else {
                    console.log('=== PROFILE CREATED SUCCESSFULLY ===');
                    console.log('Profile created successfully in database');
                    console.log('Profile insert response:', profileInsertData);
                    
                    // Verify the data was actually inserted
                    if (profileInsertData && profileInsertData.length > 0) {
                        console.log('✅ Profile data verified in database:', profileInsertData[0]);
                    } else {
                        console.warn('⚠️ Profile insert returned no data - might not have been saved');
                    }
                }
            } catch (profileErr) {
                console.error('=== PROFILE CREATION EXCEPTION ===');
                console.error('Profile creation exception:', profileErr);
                console.error('Exception details:', {
                    message: profileErr.message,
                    stack: profileErr.stack
                });
                // Continue with registration even if profile creation fails
            }

            // Step 3: Insert into users table (optional, for compatibility)
            console.log('=== STEP 3: INSERT INTO USERS TABLE ===');
            try {
                const usersData = {
                    name: firstName + ' ' + lastName,
                    email: registerEmail,
                    merchant_user_id: null // No merchant_user_id for this test function
                };
                console.log('Users table data to insert:', usersData);
                
                const usersStartTime = Date.now();
                const { data: usersInsertData, error: usersError } = await supabase.from('users').insert([usersData]);
                const usersEndTime = Date.now();
                console.log(`Users table insert completed in ${usersEndTime - usersStartTime}ms`);
                
                if (usersError) {
                    console.warn('=== USERS TABLE INSERT ERROR ===');
                    console.warn('Users table insert failed:', usersError);
                    console.warn('Users error details:', {
                        message: usersError.message,
                        details: usersError.details,
                        hint: usersError.hint,
                        code: usersError.code
                    });
                } else {
                    console.log('=== USERS TABLE INSERT SUCCESS ===');
                    console.log('Users table insert successful:', usersInsertData);
                }
                // This is not critical, continue with registration
            } catch (insertError) {
                console.warn('=== USERS TABLE INSERT EXCEPTION ===');
                console.warn('Users table insert exception:', insertError);
                console.warn('Exception details:', {
                    message: insertError.message,
                    stack: insertError.stack
                });
                // This is not critical, continue with registration
            }

            // Step 4: Verify data was saved
            console.log('=== STEP 4: VERIFY DATA SAVED ===');
            try {
                const { data: verifyData, error: verifyError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .single();
                
                if (verifyError) {
                    console.warn('⚠️ Could not verify profile data:', verifyError);
                } else if (verifyData) {
                    console.log('✅ Profile data verified in database:', verifyData);
                } else {
                    console.warn('⚠️ Profile data not found in database after creation');
                }
            } catch (verifyErr) {
                console.warn('⚠️ Error during data verification:', verifyErr);
            }

            // Registration completed successfully
            console.log('=== REGISTRATION COMPLETED SUCCESSFULLY ===');
            console.log('All steps completed without critical errors');
            setSuccess("Confirmation email sent! Please check your inbox and spam folder to complete your registration.")
            setRegistrationSent(true)
            setLoading(false)
            setTimeout(() => {
                setIsRegisterMode(false);
                setSuccess(null);
                setError(null);
            }, 2000);

        } catch (err: any) {
            console.error('=== UNEXPECTED REGISTRATION ERROR ===');
            console.error('Unexpected registration error:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
            console.error('Full error object:', err);
            setError("An unexpected error occurred during registration. Please try again.")
        } finally {
            console.log('=== REGISTRATION PROCESS ENDED ===');
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setError("Please enter your email address.")
            return
        }
        setLoading(true)
        setError(null)
        setSuccess(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirect to home page after reset
        })

        setLoading(false)

        if (error) {
            // For security, show a generic success message even if the user doesn't exist
            console.error("Forgot password error:", error)
            setSuccess("If an account with this email exists, a password reset link has been sent.")
        } else {
            setSuccess("Password reset link sent! Please check your email inbox and spam folder.")
        }
    }

    const switchToRegister = () => {
        setIsRegisterMode(true)
        setError(null)
        setSuccess(null)
    }

    const switchToLogin = () => {
        setIsRegisterMode(false)
        setError(null)
        setSuccess(null)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`sm:max-w-md ${isRegisterMode ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
                <DialogHeader className={isRegisterMode ? "sticky top-0 bg-white z-10 pb-4 border-b border-gray-100" : ""}>
                    <DialogTitle className="text-center text-2xl font-bold text-emerald-800 font-montserrat">
                        {isRegisterMode ? "Register" : "Sign In"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isRegisterMode ? "Register for a new account" : "Sign in to your account"}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                    {!isRegisterMode ? (
                        // Login Form
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="hidden" name="merchant_user_id" value="merchant123" />
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="e.g. user@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <button
                                    type="button"
                                    onClick={() => setForgotPasswordMode(true)}
                                    className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-gold-600 hover:bg-gold-700 text-white font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                                disabled={loading || !email || !password}
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>
                            
                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                                </div>
                            </div>
                            
                            {/* Google Sign-in Button */}
                            <GoogleLoginButton 
                                mode="login" 
                                disabled={loading}
                                className="min-h-[48px] font-montserrat"
                            />
                            
                            <div className="text-center mt-4">
                                <span className="text-sm text-gray-600">Don't have an account? </span>
                                <button
                                    type="button"
                                    onClick={switchToRegister}
                                    className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Register
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Register Form
                        <form onSubmit={handleRegister} className="space-y-4 pb-6">
                            <input type="hidden" name="merchant_user_id" value="merchant123" />
                            <div className="flex gap-3">
                                <div className="w-1/2 space-y-2">
                                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            placeholder="First Name"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <div className="w-1/2 space-y-2">
                                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            placeholder="Last Name"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="registerEmail" className="text-sm font-medium text-gray-700">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="registerEmail"
                                        name="registerEmail"
                                        type="email"
                                        placeholder="e.g. user@example.com"
                                        value={registerEmail}
                                        onChange={e => setRegisterEmail(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        placeholder="e.g. +1234567890"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="address"
                                        name="address"
                                        type="text"
                                        placeholder="e.g. 123 Main St, City, State, ZIP"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="createPassword" className="text-sm font-medium text-gray-700">Create Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="createPassword"
                                        name="createPassword"
                                        type="password"
                                        placeholder="Create password"
                                        value={createPassword}
                                        onChange={e => setCreatePassword(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="pl-10 border-emerald-200 focus:border-gold-600 focus:ring-gold-600"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-300 hover:scale-105 min-h-[48px]"
                                disabled={loading || registrationSent}
                            >
                                {loading ? "Creating Account..." : registrationSent ? "Email Sent!" : "Create Account"}
                            </Button>
                            
                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                                </div>
                            </div>
                            
                            {/* Google Sign-in Button */}
                            <GoogleLoginButton 
                                mode="register" 
                                disabled={loading || registrationSent}
                                className="min-h-[48px] font-montserrat"
                            />
                            
                            <div className="text-center mt-4">
                                <span className="text-sm text-gray-600">Already have an account? </span>
                                <button
                                    type="button"
                                    onClick={switchToLogin}
                                    className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Sign In
                                </button>
                            </div>
                        </form>
                    )}
                    {error && <div className="mt-4 text-center text-red-600 text-sm">{error}</div>}
                    {success && <div className="mt-4 text-center text-emerald-700 text-sm">{success}</div>}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export { LoginPopup } 