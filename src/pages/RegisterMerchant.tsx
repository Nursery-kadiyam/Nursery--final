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
        
        // Generate merchant code
        const year = new Date().getFullYear();
        const { count } = await supabase
            .from('merchants')
            .select('id', { count: 'exact', head: true })
            .ilike('merchant_code', `MC-${year}-%`);
        const nextNumber = (count || 0) + 1;
        const merchantCode = `MC-${year}-${String(nextNumber).padStart(4, '0')}`;
        
        const { error } = await supabase.from("merchants").insert([
            {
                full_name: data.fullName,
                nursery_name: data.nurseryName,
                phone_number: data.phoneNumber,
                email: data.email,
                nursery_address: data.nurseryAddress,
                merchant_code: merchantCode,
                status: 'pending',
            },
        ]);
        if (error) {
            setError("Submission failed. Please try again later.");
        } else {
            setSubmitted(true);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto mt-4 p-3 bg-white rounded shadow">
                <h2 className="text-2xl font-bold mb-4">Registration Submitted</h2>
                <p>Your account will be reviewed. You will be notified once approved.</p>
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