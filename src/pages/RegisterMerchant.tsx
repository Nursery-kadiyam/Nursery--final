import React, { useState } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";

interface MerchantFormInputs {
    fullName: string;
    nurseryName: string;
    phoneNumber: string;
    email: string;
    nurseryAddress: string;
}

const RegisterMerchant: React.FC = () => {
    const methods = useForm<MerchantFormInputs>();
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit: SubmitHandler<MerchantFormInputs> = async (data) => {
        setError(null);
        
        try {
            console.log('🔄 Submitting merchant registration...', data);
            
            // Get current user if logged in
            const { data: { user } } = await supabase.auth.getUser();
            
            // Use the database function for better error handling
            const { data: result, error } = await supabase.rpc('register_merchant', {
                p_full_name: data.fullName,
                p_nursery_name: data.nurseryName,
                p_phone_number: data.phoneNumber,
                p_email: data.email,
                p_nursery_address: data.nurseryAddress,
                p_user_id: user?.id || null
            });
            
            if (error) {
                console.error('❌ Database function error:', error);
                setError(`Database error: ${error.message}`);
                return;
            }
            
            if (result && result.success) {
                console.log('✅ Merchant registration successful:', result);
                setSubmitted(true);
            } else {
                console.error('❌ Registration failed:', result);
                setError(result?.message || 'Registration failed. Please try again.');
            }
            
        } catch (err) {
            console.error('💥 Unexpected error:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto mt-4 p-3 bg-white rounded shadow">
                <h2 className="text-2xl font-bold mb-4 text-green-600">✅ Registration Submitted</h2>
                <p className="text-gray-700 mb-4">Your merchant registration has been submitted successfully!</p>
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                    <p className="text-sm text-green-800">
                        <strong>What happens next?</strong>
                    </p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                        <li>• Our admin team will review your application</li>
                        <li>• You will receive an email notification once approved</li>
                        <li>• You can then log in and start managing your nursery</li>
                    </ul>
                </div>
                <p className="text-sm text-gray-600">Thank you for choosing to partner with us!</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-4 p-3 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Register as Merchant</h2>
            <p className="mb-3 text-gray-600 text-sm">Please fill the form below to register your nursery with us. Your request will be reviewed by our admin team before activation.</p>
            {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
            <FormProvider {...methods}>
                <Form onSubmit={methods.handleSubmit(onSubmit)}>
                    <FormField name="fullName" control={methods.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="nurseryName" control={methods.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nursery Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your nursery name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="phoneNumber" control={methods.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="email" control={methods.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="nurseryAddress" control={methods.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nursery Address</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Enter your nursery address" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" className="mt-4 w-full">Submit</Button>
                </Form>
            </FormProvider>
        </div>
    );
};

export default RegisterMerchant; 