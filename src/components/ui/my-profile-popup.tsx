import * as React from "react"
import { User, Mail, Phone, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Label } from "./label"
import { useAuth } from "@/contexts/AuthContext"

interface MyProfilePopupProps {
    isOpen: boolean
    onClose: () => void
}

const MyProfilePopup: React.FC<MyProfilePopupProps> = ({ isOpen, onClose }) => {
    const [profile, setProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const { user, signOut } = useAuth()
    const [editMode, setEditMode] = React.useState(false);
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');

    React.useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true)
            setErrorMsg('')
            if (user) {
                try {
                    let { data: profileData, error } = await supabase
                        .from("user_profiles")
                        .select("first_name, last_name, email, phone")
                        .eq("user_id", user.id)
                        .maybeSingle();
                    
                    if (!profileData && !error) {
                        // Profile does not exist, create it
                        const { error: insertError } = await supabase.from('user_profiles').insert([{
                            user_id: user.id,
                            email: user.email,
                            first_name: user.user_metadata?.first_name || '',
                            last_name: user.user_metadata?.last_name || '',
                            phone: user.user_metadata?.phone || '',
                            created_at: new Date().toISOString()
                        }]);
                        if (!insertError) {
                            // Try fetching again
                            ({ data: profileData, error } = await supabase
                                .from("user_profiles")
                                .select("first_name, last_name, email, phone")
                                .eq("user_id", user.id)
                                .maybeSingle());
                        }
                    }
                    
                    if (error) {
                        console.error('Profile fetch error:', error);
                        setProfile(null);
                        setErrorMsg('Could not load profile. Please try again.');
                    } else {
                        setProfile(profileData);
                        setErrorMsg('');
                    }
                } catch (err) {
                    console.error('Profile fetch error:', err);
                    setProfile(null);
                    setErrorMsg('Could not load profile. Please try again.');
                }
            } else {
                setProfile(null);
            }
            setLoading(false)
        }
        if (isOpen) {
            fetchProfile()
        }
    }, [isOpen, user])

    React.useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setPhone(profile.phone || '');
        }
    }, [profile]);

    const handleSave = async () => {
        setSaving(true);
        setErrorMsg('');
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone
                })
                .eq('user_id', user.id);
            
            if (error) {
                setErrorMsg('Failed to update profile. Please try again.');
            } else {
                setEditMode(false);
                // Refresh profile
                const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('first_name, last_name, email, phone')
                    .eq('user_id', user.id)
                    .maybeSingle();
                setProfile(profileData);
            }
        } catch (err) {
            setErrorMsg('Failed to update profile. Please try again.');
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        await signOut()
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-2xl shadow-2xl border-0" aria-describedby="profile-dialog-desc">
                <DialogDescription id="profile-dialog-desc" className="sr-only">View and edit your profile information</DialogDescription>
                {/* Logo at the top */}
                <div className="flex flex-col items-center mb-4">
                    <span className="text-2xl font-bold font-montserrat leading-tight">
                        <span className="text-emerald-800">Nursery</span>
                    </span>
                    <span className="text-base text-gold-600 font-lora italic border-b border-gold-600/30 hover:border-gold-600 transition-all duration-300 leading-snug">
                        Kadiyam
                    </span>
                </div>
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center text-emerald-700 text-2xl font-bold mb-2">
                        <User className="w-6 h-6 mr-2 text-emerald-600" />
                        My Profile
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 pt-0">
                    {loading ? (
                        <p>Loading profile...</p>
                    ) : profile ? (
                        <div className="space-y-4">
                            {editMode ? (
                                <>
                                    <div>
                                        <Label>First Name</Label>
                                        <input type="text" className="border rounded px-2 py-1 w-full mt-1" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>Last Name</Label>
                                        <input type="text" className="border rounded px-2 py-1 w-full mt-1" value={lastName} onChange={e => setLastName(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>Mobile Number</Label>
                                        <input type="text" className="border rounded px-2 py-1 w-full mt-1" value={phone} onChange={e => setPhone(e.target.value)} />
                                    </div>
                                    {errorMsg && <div className="text-red-500 text-sm">{errorMsg}</div>}
                                    <div className="flex gap-2 mt-4">
                                        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Saving...' : 'Save'}</Button>
                                        <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <Label>Full Name</Label>
                                        <div className="flex items-center mt-1">
                                            <User className="w-4 h-4 mr-2 text-gray-400" />
                                            <p>{profile.first_name} {profile.last_name}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Email Address</Label>
                                        <div className="flex items-center mt-1">
                                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                            <p>{profile.email}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Mobile Number</Label>
                                        <div className="flex items-center mt-1">
                                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                            <p>{profile.phone || "Not provided"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button onClick={() => setEditMode(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Edit Profile</Button>
                                    </div>
                                </>
                            )}
                            <div className="border-t border-emerald-100 my-6"></div>
                            <Button
                                onClick={handleLogout}
                                className="w-full bg-gold-600 hover:bg-gold-700 text-white font-bold py-3 rounded-lg shadow-md transition-all duration-200"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="text-red-500 mb-4">{errorMsg || 'Could not load profile. Please try again.'}</div>
                            <Button 
                                onClick={() => window.location.reload()} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default MyProfilePopup 
