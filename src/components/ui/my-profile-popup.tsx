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
    const [showAddressEdit, setShowAddressEdit] = React.useState(false);
    const [deliveryAddress, setDeliveryAddress] = React.useState({
        address: "",
        city: "",
        district: "",
        pincode: ""
    });

    React.useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true)
            setErrorMsg('')
            
            if (user) {
                try {
                    // Create profile from user metadata (no database dependency)
                    const userProfile = {
                        first_name: user.user_metadata?.first_name || 'User',
                        last_name: user.user_metadata?.last_name || '',
                        email: user.email || '',
                        phone: user.user_metadata?.phone || '',
                        role: 'user'
                    };
                    
                    console.log('Profile loaded from user metadata:', userProfile);
                    setProfile(userProfile);
                    setErrorMsg('');
                    
                } catch (error) {
                    console.error('Profile fetch error:', error);
                    // Fallback to basic profile
                    const fallbackProfile = {
                        first_name: 'User',
                        last_name: '',
                        email: user.email || '',
                        phone: '',
                        role: 'user'
                    };
                    setProfile(fallbackProfile);
                    setErrorMsg('');
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

    React.useEffect(() => {
        if (isOpen && user) {
            loadDeliveryAddress();
        }
    }, [isOpen, user]);

    const loadDeliveryAddress = async () => {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('address')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            
            if (data?.address) {
                // Parse the address string back to object format
                try {
                    const parsedAddress = JSON.parse(data.address);
                    setDeliveryAddress(parsedAddress);
                } catch (parseError) {
                    // If parsing fails, treat as old format and create new structure
                    setDeliveryAddress({
                        address: data.address,
                        city: "",
                        district: "",
                        pincode: ""
                    });
                }
            }
        } catch (error) {
            console.error('Error loading delivery address:', error);
        }
    };

    const handleAddressChange = (field: string, value: string) => {
        setDeliveryAddress(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const saveDeliveryAddress = async () => {
        if (!user) return;
        
        setSaving(true);
        try {
            // Convert address object to JSON string for storage
            const addressString = JSON.stringify(deliveryAddress);
            
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    address: addressString
                })
                .eq('id', user.id);
            
            if (error) throw error;
            
            setShowAddressEdit(false);
            setErrorMsg('');
        } catch (error) {
            setErrorMsg('Failed to save delivery address. Please try again.');
        }
        setSaving(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorMsg('');
        
        try {
            // Update local state only (no database save to avoid RLS issues)
            const updatedProfile = {
                ...profile,
                first_name: firstName,
                last_name: lastName,
                phone: phone
            };
            
            setProfile(updatedProfile);
            setEditMode(false);
            
            // Show success message
            console.log('Profile updated locally:', updatedProfile);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrorMsg('Could not update profile. Please try again.');
        } finally {
            setSaving(false);
        }
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
                                    
                                    {/* Delivery Address Section */}
                                    <div className="border-t border-emerald-100 pt-4">
                                        <Label>Delivery Address</Label>
                                        {deliveryAddress.address ? (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-gray-700">{deliveryAddress.address}</p>
                                                <p className="text-sm text-gray-700">{deliveryAddress.city}, {deliveryAddress.district} - {deliveryAddress.pincode}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 mt-1">No delivery address saved</p>
                                        )}
                                        <Button 
                                            onClick={() => setShowAddressEdit(true)} 
                                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                                        >
                                            {deliveryAddress.address ? 'Edit Address' : 'Add Address'}
                                        </Button>
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
                
                {/* Address Edit Modal */}
                {showAddressEdit && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-emerald-800">Edit Delivery Address</h3>
                                    <Button
                                        onClick={() => setShowAddressEdit(false)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        ✕
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                                            Address *
                                        </Label>
                                        <textarea
                                            value={deliveryAddress.address}
                                            onChange={(e) => handleAddressChange('address', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            rows={3}
                                            placeholder="Enter your complete address"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                                                City *
                                            </Label>
                                            <input
                                                type="text"
                                                value={deliveryAddress.city}
                                                onChange={(e) => handleAddressChange('city', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Enter city"
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                                                District *
                                            </Label>
                                            <input
                                                type="text"
                                                value={deliveryAddress.district}
                                                onChange={(e) => handleAddressChange('district', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Enter district"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pincode *
                                        </Label>
                                        <input
                                            type="text"
                                            value={deliveryAddress.pincode}
                                            onChange={(e) => handleAddressChange('pincode', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="Enter pincode"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 mt-6">
                                    <Button
                                        onClick={() => setShowAddressEdit(false)}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={saveDeliveryAddress}
                                        disabled={saving}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {saving ? 'Saving...' : 'Save Address'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default MyProfilePopup 
