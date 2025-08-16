import * as React from "react"
import { Mail, Lock, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
                    .eq('user_id', data.user.id)
                    .maybeSingle();
                if (profile && (!profile.first_name || !profile.last_name || !profile.phone)) {
                    // Try to get from user_metadata (if available)
                    const updates = {};
                    if (!profile.first_name && data.user.user_metadata?.first_name) updates.first_name = data.user.user_metadata.first_name;
                    if (!profile.last_name && data.user.user_metadata?.last_name) updates.last_name = data.user.user_metadata.last_name;
                    if (!profile.phone && data.user.user_metadata?.phone) updates.phone = data.user.user_metadata.phone;
                    if (Object.keys(updates).length > 0) {
                        console.log('Updating missing profile fields after login:', updates);
                        await supabase
                            .from('user_profiles')
                            .update(updates)
                            .eq('user_id', data.user.id);
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
                    .eq('user_id', data.user.id)
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (registrationSent) return; // Prevent re-submission

        setLoading(true)
        setError(null)
        setSuccess(null)

        // Get merchant_user_id from the hidden input
        const formData = new FormData(e.target as HTMLFormElement);
        const merchantUserId = formData.get('merchant_user_id');

        // Validation
        if (!firstName.trim()) {
            setError("First name is required."); setLoading(false); return;
        }
        if (!lastName.trim()) {
            setError("Last name is required."); setLoading(false); return;
        }
        if (!/^\S+@\S+\.\S+$/.test(registerEmail)) {
            setError("Please enter a valid email address."); setLoading(false); return;
        }
        if (!/^\+?\d{10,15}$/.test(phone)) {
            setError("Please enter a valid phone number (10-15 digits, may start with +)."); setLoading(false); return;
        }
        if (createPassword.length < 6) {
            setError("Password must be at least 6 characters."); setLoading(false); return;
        }
        if (createPassword !== confirmPassword) {
            setError("Passwords do not match."); setLoading(false); return;
        }

        try {
            console.log('Starting registration for:', registerEmail)

            // Step 1: Create user account with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: registerEmail,
                password: createPassword,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        phone: phone
                    }
                }
            })

            if (authError) {
                // Handle specific auth errors
                if (authError.message.includes("rate limit")) {
                    setError("Too many attempts. Please wait a few minutes before trying again.");
                } else if (authError.message.includes("already registered")) {
                    setError("This email is already registered. Please try logging in.");
                } else {
                    setError("Could not create account. Please try again.");
                }
                console.error('Registration error:', authError)
                setLoading(false)
                return
            }

            if (!authData.user) {
                console.error('No user returned from signup')
                setError("Registration failed: No user created. Please try again.")
                setLoading(false)
                return
            }

            console.log('User created successfully in Supabase Auth:', authData.user.id)

            // Step 2: Insert user data into 'users' table with merchant_user_id
            try {
                await supabase.from('users').insert([
                    {
                        name: firstName + ' ' + lastName,
                        email: registerEmail,
                        merchant_user_id: merchantUserId
                    }
                ]);
            } catch (insertError) {
                console.warn('User insert into users table failed:', insertError);
            }

            // Step 3: Always upsert profile in database for new user (with logging)
            const profileData = {
                user_id: authData.user.id,
                first_name: firstName,
                last_name: lastName,
                email: registerEmail,
                phone: phone,
                created_at: new Date().toISOString()
            };
            console.log('Upserting profile:', profileData);
            const { error: profileError } = await supabase
                .from('user_profiles')
                .upsert([profileData], { onConflict: 'user_id' });
            if (profileError) {
                console.error('Profile upsert error:', profileError);
            } else {
                console.log('Profile upserted successfully in database');
            }

            // On success, we don't create a profile yet, user needs to confirm email
            setSuccess("Confirmation email sent! Please check your inbox and spam folder to complete your registration.")
            setRegistrationSent(true)
            setLoading(false)
            setTimeout(() => {
                setIsRegisterMode(false);
                setSuccess(null);
                setError(null);
            }, 2000);

        } catch (err: any) {
            console.error('Unexpected registration error:', err)
            setError("An unexpected error occurred during registration. Please try again.")
        } finally {
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
            <DialogContent className={`sm:max-w-md ${isRegisterMode ? 'max-h-[90vh] overflow-y-auto' : ''}`} aria-describedby="login-dialog-desc">
                <div id="login-dialog-desc" className="sr-only">
                    {isRegisterMode ? "Register for a new account" : "Sign in to your account"}
                </div>
                <DialogHeader className={isRegisterMode ? "sticky top-0 bg-white z-10 pb-4 border-b border-gray-100" : ""}>
                    <DialogTitle className="text-center text-2xl font-bold text-emerald-800 font-montserrat">
                        {isRegisterMode ? "Register" : "Sign In"}
                    </DialogTitle>
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