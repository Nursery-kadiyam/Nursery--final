import * as React from "react"
import { User, Mail, Phone, Home, Building, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"

// Razorpay types
declare global {
    interface Window {
        Razorpay: any;
    }
}

interface GuestCheckoutPopupProps {
    isOpen: boolean
    onClose: () => void
    onGuestCheckout: (details: any) => void
    total: number
}

const GuestCheckoutPopup: React.FC<GuestCheckoutPopupProps> = ({ isOpen, onClose, onGuestCheckout, total }) => {
    const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        deliveryStreet: "",
        deliveryFlatNo: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryPincode: "",
        shippingAddress: "",
    })
    const [isShippingSame, setIsShippingSame] = React.useState(true)
    const [loading, setLoading] = React.useState(false)
    const { toast } = useToast()
    const [showOrderPlacedModal, setShowOrderPlacedModal] = React.useState(false)
    const navigate = useNavigate()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    React.useEffect(() => {
        if (isShippingSame) {
            const { deliveryStreet, deliveryFlatNo, deliveryCity, deliveryState, deliveryPincode } = formData;
            const fullAddress = [deliveryFlatNo, deliveryStreet, deliveryCity, deliveryState, deliveryPincode].filter(Boolean).join(", ");
            setFormData(prev => ({ ...prev, shippingAddress: fullAddress }));
        } else {
            setFormData(prev => ({ ...prev, shippingAddress: "" }));
        }
    }, [isShippingSame, formData.deliveryStreet, formData.deliveryFlatNo, formData.deliveryCity, formData.deliveryState, formData.deliveryPincode]);

    const handleRazorpayPayment = async (orderId: number) => {
        try {
            // Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);

            script.onload = () => {
                const merchantUserId = 'merchant123'; // Replace with dynamic value if needed
                const options = {
                    key: 'rzp_test_WPvQUvApN7wUvC', // Your Razorpay test key
                    amount: total * 100, // Amount in paise
                    currency: 'INR',
                    name: 'Kadiyam Nursery',
                    description: 'Premium Plants Purchase',
                    image: '/placeholder.svg',
                    order_id: '', // You would generate this from backend
                    handler: async function (response: any) {
                        console.log('Payment successful:', response);

                        const { error: updateError } = await supabase
                            .from('orders')
                            .update({
                                status: 'payment_successful',
                                razorpay_payment_id: response.razorpay_payment_id
                            })
                            .eq('id', orderId);

                        if (updateError) {
                            toast({
                                title: "Error updating order",
                                description: updateError.message,
                                variant: "destructive",
                            });
                        } else {
                            // Insert order_items for each cart item
                            const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
                            const orderItems = cartItems.map((item: any) => ({
                                order_id: orderId,
                                product_id: item.id,
                                quantity: item.quantity,
                                price: item.price
                            }));
                            if (orderItems.length > 0) {
                                const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);
                                if (orderItemsError) {
                                    toast({
                                        title: "Error saving order items",
                                        description: orderItemsError.message,
                                        variant: "destructive",
                                    });
                                }
                            }
                            setShowOrderPlacedModal(true);
                            // Clear cart and inform delivery time
                            localStorage.removeItem('cart');
                            window.dispatchEvent(new CustomEvent('cart-updated'));
                            setTimeout(() => {
                                navigate("/dashboard", { state: { tab: "orders" } });
                            }, 1200);
                        }

                        onClose();
                    },
                    prefill: {
                        name: `${formData.firstName} ${formData.lastName}`,
                        email: formData.email,
                        contact: formData.phone
                    },
                    notes: {
                        shipping_address: formData.shippingAddress,
                        delivery_address: [formData.deliveryFlatNo, formData.deliveryStreet, formData.deliveryCity, formData.deliveryState, formData.deliveryPincode].filter(Boolean).join(", "),
                        merchant_user_id: merchantUserId
                    },
                    theme: {
                        color: '#2E7D32'
                    },
                    modal: {
                        ondismiss: function () {
                            toast({
                                title: "Payment Cancelled",
                                description: "Your payment was cancelled. You can try again.",
                                variant: "destructive",
                            });
                            setLoading(false);
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            };

            script.onerror = () => {
                toast({
                    title: "Payment Error",
                    description: "Failed to load payment gateway. Please try again.",
                    variant: "destructive",
                });
                setLoading(false);
            };
        } catch (error) {
            console.error('Payment error:', error);
            toast({
                title: "Payment Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Basic validation
        const requiredFields: (keyof typeof formData)[] = ['firstName', 'lastName', 'email', 'phone', 'deliveryStreet', 'deliveryFlatNo', 'deliveryCity', 'deliveryState', 'deliveryPincode', 'shippingAddress'];

        for (const key of requiredFields) {
            if (!formData[key]) {
                toast({
                    title: "Missing Information",
                    description: `Please fill out all required fields.`,
                    variant: "destructive",
                })
                setLoading(false)
                return
            }
        }

        const delivery_address_obj = {
            street: formData.deliveryStreet,
            flat_no: formData.deliveryFlatNo,
            city: formData.deliveryCity,
            state: formData.deliveryState,
            pincode: formData.deliveryPincode,
        };

        // 1. Upsert guest user with their latest details and address
        const { data: guestData, error: guestError } = await supabase
            .from('guest_users')
            .upsert({
                email: formData.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                delivery_address: delivery_address_obj,
                shipping_address: formData.shippingAddress,
            }, { onConflict: 'email' })
            .select();

        if (guestError || !guestData) {
            toast({
                title: "Error saving guest details",
                description: guestError?.message || "Could not save guest user to the database.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const guestUser = guestData[0];
        const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');

        // 2. Insert order with a snapshot of the addresses
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([{
                guest_user_id: guestUser.id,
                delivery_address: delivery_address_obj,
                shipping_address: formData.shippingAddress,
                total_amount: total,
                cart_items: cartItems,
                status: 'pending_payment'
            }])
            .select();

        if (orderError || !orderData) {
            toast({
                title: "Error saving order",
                description: orderError?.message || "Could not save order to the database.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const newOrder = orderData[0];
        onGuestCheckout(formData);

        await handleRazorpayPayment(newOrder.id);
    }

    // Reset form when popup is closed
    React.useEffect(() => {
        if (!isOpen) {
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                deliveryStreet: "",
                deliveryFlatNo: "",
                deliveryCity: "",
                deliveryState: "",
                deliveryPincode: "",
                shippingAddress: "",
            })
            setIsShippingSame(true)
        }
    }, [isOpen])

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold text-emerald-800 font-montserrat">
                            Continue as Guest
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Please provide your details for delivery.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input id="firstName" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} required className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input id="lastName" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} required className="pl-10" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input id="email" name="email" type="email" placeholder="john.doe@example.com" value={formData.email} onChange={handleChange} required className="pl-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Mobile Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} required className="pl-10" />
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t mt-4">
                            <h3 className="text-sm font-medium leading-none">Delivery Address</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryStreet">Street</Label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input id="deliveryStreet" name="deliveryStreet" placeholder="e.g. Main Road" value={formData.deliveryStreet} onChange={handleChange} required className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryFlatNo">Flat No.</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input id="deliveryFlatNo" name="deliveryFlatNo" placeholder="e.g. 12-34-5" value={formData.deliveryFlatNo} onChange={handleChange} required className="pl-10" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryCity">City</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input id="deliveryCity" name="deliveryCity" placeholder="e.g. Kadiyam" value={formData.deliveryCity} onChange={handleChange} required className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryState">State</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input id="deliveryState" name="deliveryState" placeholder="e.g. Andhra Pradesh" value={formData.deliveryState} onChange={handleChange} required className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryPincode">Pincode</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input id="deliveryPincode" name="deliveryPincode" placeholder="e.g. 533126" value={formData.deliveryPincode} onChange={handleChange} required className="pl-10" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="shippingSame"
                                name="shippingSame"
                                checked={isShippingSame}
                                onChange={(e) => setIsShippingSame(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <Label htmlFor="shippingSame" className="text-sm font-medium text-gray-700">
                                My shipping address is the same as my delivery address.
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shippingAddress">Shipping Address</Label>
                            <div className="relative">
                                <Home className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                                <textarea
                                    id="shippingAddress"
                                    name="shippingAddress"
                                    placeholder="Enter your complete shipping address"
                                    value={formData.shippingAddress}
                                    onChange={handleChange}
                                    required
                                    readOnly={isShippingSame}
                                    className="w-full min-h-[80px] pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-300 hover:scale-105 min-h-[48px] font-montserrat"
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Continue to Payment"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={showOrderPlacedModal} onOpenChange={setShowOrderPlacedModal}>
                <DialogContent className="max-w-md text-center">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-emerald-800">Order Placed!</DialogTitle>
                        <DialogDescription className="mt-2 text-lg text-gray-700">
                            Your order will be delivered within 5–7 days.
                        </DialogDescription>
                    </DialogHeader>
                    <button
                        className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 transition"
                        onClick={() => setShowOrderPlacedModal(false)}
                    >
                        Close
                    </button>
                </DialogContent>
            </Dialog>
        </>
    )
}

export { GuestCheckoutPopup } 