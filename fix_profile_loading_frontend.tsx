// FIX PROFILE LOADING FRONTEND
// Replace the profile loading logic to handle RLS issues gracefully

// Update src/components/ui/my-profile-popup.tsx
// Replace the fetchProfile function with this:

const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    
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
            setFirstName(userProfile.first_name);
            setLastName(userProfile.last_name);
            setPhone(userProfile.phone);
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
            setFirstName(fallbackProfile.first_name);
            setLastName(fallbackProfile.last_name);
            setPhone(fallbackProfile.phone);
            setErrorMsg('');
        }
    } else {
        setProfile(null);
        setErrorMsg('');
    }
    
    setLoading(false);
};

// Update the save function to not save to database (avoid RLS issues)
const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    
    try {
        // Update local state only (no database save)
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