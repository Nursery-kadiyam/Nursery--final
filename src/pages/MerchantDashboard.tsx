import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

const MerchantDashboard: React.FC = () => {
    const [merchantStatus, setMerchantStatus] = useState<string>('pending');
    const [merchantCode, setMerchantCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMerchantStatus = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: merchantData, error } = await supabase
                .from('merchants')
                .select('status, merchant_code')
                .eq('email', user.email)
                .single();

            if (!error && merchantData) {
                setMerchantStatus(merchantData.status);
                setMerchantCode(merchantData.merchant_code);
            }
            setLoading(false);
        };
        fetchMerchantStatus();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (merchantStatus === 'pending') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-yellow-600">⏳ Application Pending</CardTitle>
                        <CardDescription className="text-center">
                            Your merchant application is currently under review. You'll be notified once it's approved.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={() => navigate('/')} className="w-full">
                            Return to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (merchantStatus === 'rejected') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-red-600">❌ Application Rejected</CardTitle>
                        <CardDescription className="text-center">
                            Your merchant application has been rejected. Please contact support for more information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={() => navigate('/')} className="w-full">
                            Return to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Merchant Dashboard</h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage your products, quotations, and business operations</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs sm:text-sm font-medium">Merchant Code</CardTitle>
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg sm:text-2xl font-bold text-blue-600 font-mono break-all">{merchantCode}</div>
                            <p className="text-xs text-muted-foreground">Your unique identifier</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs sm:text-sm font-medium">Status</CardTitle>
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Active merchant account</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs sm:text-sm font-medium">Available Quotations</CardTitle>
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg sm:text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Pending requests</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs sm:text-sm font-medium">Submitted Quotes</CardTitle>
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg sm:text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Your submissions</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="quotations" className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10">
                        <TabsTrigger value="quotations" className="text-xs sm:text-sm py-2 sm:py-1">Available Quotations</TabsTrigger>
                        <TabsTrigger value="submitted" className="text-xs sm:text-sm py-2 sm:py-1">My Submissions</TabsTrigger>
                        <TabsTrigger value="products" className="text-xs sm:text-sm py-2 sm:py-1">Product Management</TabsTrigger>
                    </TabsList>

                    <TabsContent value="quotations" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Available Quotations</CardTitle>
                                <CardDescription className="text-sm">
                                    Review and submit quotes for user requests
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MerchantQuotations merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="submitted" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">My Submitted Quotations</CardTitle>
                                <CardDescription className="text-sm">
                                    Track the status of your submitted quotes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MySubmittedQuotations merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Product Management</CardTitle>
                                <CardDescription className="text-sm">
                                    Manage your product catalog and inventory
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ProductManagement merchantEmail={merchantCode || ''} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

const ProductManagement: React.FC<{ merchantEmail: string }> = ({ merchantEmail }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        available_quantity: '',
        image_url: ''
    });

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('merchant_email', merchantEmail)
            .order('created_at', { ascending: false });
        if (!error) setProducts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [merchantEmail]);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('products')
            .insert([{
                name: formData.name,
                price: parseFloat(formData.price),
                available_quantity: parseInt(formData.available_quantity),
                image_url: formData.image_url,
                merchant_email: merchantEmail
            }]);
        if (!error) {
            setShowAddDialog(false);
            setFormData({ name: '', price: '', available_quantity: '', image_url: '' });
            fetchProducts();
            toast({
                title: "Product Added",
                description: "Product has been added successfully.",
                variant: "default"
            });
        }
    };

    const openEditDialog = (product: any) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            available_quantity: product.available_quantity.toString(),
            image_url: product.image_url || ''
        });
        setShowAddDialog(true);
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('products')
            .update({
                name: formData.name,
                price: parseFloat(formData.price),
                available_quantity: parseInt(formData.available_quantity),
                image_url: formData.image_url
            })
            .eq('id', editingProduct.id);
        if (!error) {
            setShowAddDialog(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', available_quantity: '', image_url: '' });
            fetchProducts();
            toast({
                title: "Product Updated",
                description: "Product has been updated successfully.",
                variant: "default"
            });
        }
    };

    const handleDeleteProduct = async (product: any) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);
            if (!error) {
                fetchProducts();
                toast({
                    title: "Product Deleted",
                    description: "Product has been deleted successfully.",
                    variant: "default"
                });
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h3 className="text-lg font-semibold">Your Products</h3>
                <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
                    Add New Product
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No products found. Add your first product to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <Card key={product.id} className="overflow-hidden">
                            {product.image_url && (
                                <div className="aspect-video bg-gray-100">
                                    <img 
                                        src={product.image_url} 
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base sm:text-lg truncate">{product.name}</CardTitle>
                                <CardDescription className="text-sm">
                                    ₹{product.price} • {product.available_quantity} in stock
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => openEditDialog(product)}
                                        className="flex-1 sm:flex-none"
                                    >
                                        Edit
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => handleDeleteProduct(product)}
                                        className="flex-1 sm:flex-none"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showAddDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={editingProduct ? handleEditProduct : handleAddProduct} className="space-y-4">
                                <div>
                                    <Label htmlFor="name" className="text-sm">Product Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="h-10 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="price" className="text-sm">Price (₹)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                                        className="h-10 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="quantity" className="text-sm">Available Quantity</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={formData.available_quantity}
                                        onChange={(e) => setFormData({...formData, available_quantity: e.target.value})}
                                        className="h-10 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="image" className="text-sm">Image URL</Label>
                                    <Input
                                        id="image"
                                        type="url"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                                        className="h-10 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <Button type="submit" className="flex-1 h-10 text-sm">
                                        {editingProduct ? 'Update Product' : 'Add Product'}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddDialog(false);
                                            setEditingProduct(null);
                                            setFormData({ name: '', price: '', available_quantity: '', image_url: '' });
                                        }}
                                        className="flex-1 h-10 text-sm"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

const MerchantQuotations: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formStates, setFormStates] = useState<{ [id: string]: any }>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [productMap, setProductMap] = useState<{ [id: string]: any }>({});

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            if (!merchantCode) {
                setLoading(false);
                return;
            }
            const { data: pendingQuotations, error: pendingError } = await supabase
                .from('quotations')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (pendingError) {
                console.error('Error fetching pending quotations:', pendingError);
                setLoading(false);
                return;
            }
            const { data: merchantQuotations, error: merchantError } = await supabase
                .from('quotations')
                .select('quotation_code')
                .eq('merchant_code', merchantCode)
                .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
            if (merchantError) {
                console.error('Error fetching merchant quotations:', merchantError);
                setLoading(false);
                return;
            }
            const processedQuotationCodes = new Set(
                merchantQuotations?.map((q: any) => q.quotation_code) || []
            );
            const availableQuotations = pendingQuotations?.filter((q: any) =>
                !processedQuotationCodes.has(q.quotation_code)
            ) || [];
            setQuotations(availableQuotations);
            
            // Fetch products for all items in quotations
            const allProductIds = Array.from(new Set(
                availableQuotations.flatMap((q: any) => 
                    Array.isArray(q.items) ? q.items.map((item: any) => item.product_id) : []
                )
            ));
            
            if (allProductIds.length > 0) {
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .in('id', allProductIds);
                if (!productsError && productsData) {
                    const map: { [id: string]: any } = {};
                    productsData.forEach((p: any) => { map[p.id] = p; });
                    setProductMap(map);
                }
            }
            
            setLoading(false);
        };
        fetchQuotations();
    }, [merchantCode, submitting]);

    const handleInputChange = (id: string, field: string, value: string) => {
        setFormStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleProductPriceChange = (quotationId: string, productIndex: number, price: string) => {
        setFormStates(prev => ({
            ...prev,
            [quotationId]: {
                ...prev[quotationId],
                product_prices: {
                    ...prev[quotationId]?.product_prices,
                    [productIndex]: parseFloat(price) || 0
                }
            }
        }));
    };

    const calculateTotalProductCost = (quotationId: string, items: any[]) => {
        const productPrices = formStates[quotationId]?.product_prices || {};
        return items.reduce((total, item, index) => {
            const price = productPrices[index] || 0;
            const quantity = item.quantity || 1;
            return total + (price * quantity);
        }, 0);
    };

    const handleSubmitQuote = async (q: any) => {
        setSubmitting(q.id);
        const form = formStates[q.id] || {};
        const total_product_cost = calculateTotalProductCost(q.id, q.items || []);
        const transport_cost = parseFloat(form.transport_cost || '0');
        const custom_work_cost = parseFloat(form.custom_work_cost || '0');
        const estimated_delivery_days = form.estimated_delivery_days || '';
        const total_quote_price = total_product_cost + transport_cost + custom_work_cost;
        
        if (!merchantCode) {
            console.error('Merchant code is null. Current merchantCode state:', merchantCode);
            alert('Merchant code not found. Please contact support.');
            setSubmitting(null);
            return;
        }
        
        console.log('Creating new merchant quotation with merchant_code:', merchantCode);
        
        const newId = crypto.randomUUID();
        const { error: insertError } = await supabase
            .from('quotations')
            .insert([{
                id: newId,
                quotation_code: q.quotation_code,
                user_id: q.user_id,
                items: q.items,
                product_cost: total_product_cost,
                product_prices: form.product_prices || {},
                transport_cost,
                custom_work_cost,
                estimated_delivery_days,
                total_quote_price,
                status: 'waiting_for_admin',
                merchant_code: merchantCode,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
            
        if (insertError) {
            console.error('Failed to create merchant quotation:', insertError);
            setSubmitting(null);
            alert('Failed to submit quote: ' + insertError.message);
            return;
        }
        
        setSubmitting(null);
        
        const { data: pendingQuotations } = await supabase
            .from('quotations')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
            
        const { data: merchantQuotations } = await supabase
            .from('quotations')
            .select('quotation_code')
            .eq('merchant_code', merchantCode)
            .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
            
        const processedQuotationCodes = new Set(
            merchantQuotations?.map((q: any) => q.quotation_code) || []
        );
        
        const availableQuotations = pendingQuotations?.filter((q: any) => 
            !processedQuotationCodes.has(q.quotation_code)
        ) || [];
        
        setQuotations(availableQuotations);
        setFormStates(prev => ({ ...prev, [q.id]: {} }));
        
        toast({
            title: "Quote Submitted!",
            description: `Quote submitted successfully for: ${q.quotation_code}`,
            variant: "default"
        });
    };

    const handleCloseQuotation = async (quotationId: string) => {
        setSubmitting(quotationId);
        
        try {
            const { error } = await supabase
                .from('quotations')
                .update({ 
                    status: 'closed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', quotationId);
            
            if (error) {
                console.error('Error closing quotation:', error);
                alert('Failed to close quotation: ' + error.message);
            } else {
                // Remove the closed quotation from the list
                setQuotations(prev => prev.filter(q => q.id !== quotationId));
                setFormStates(prev => ({ ...prev, [quotationId]: {} }));
                
                toast({
                    title: "Quotation Closed",
                    description: "Quotation has been closed successfully.",
                    variant: "default"
                });
            }
        } catch (err) {
            console.error('Error closing quotation:', err);
            alert('Failed to close quotation');
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading available quotations...</p>
                </div>
            ) : quotations.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No quotations available for submission.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {quotations.map((q) => (
                        <Card key={q.id} className="overflow-hidden">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">Quotation #{q.quotation_code}</CardTitle>
                                        <CardDescription>User ID: {q.user_id}</CardDescription>
                                    </div>
                                    <Badge variant="secondary">New Request</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Requested Items & Pricing</h4>
                                        <div className="space-y-3">
                                            {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                let productId = undefined;
                                                if (typeof item === 'string' || typeof item === 'number') {
                                                    productId = item;
                                                } else if (typeof item === 'object' && item !== null) {
                                                    productId = item.product_id || item.id;
                                                }
                                                const product = productMap[productId];
                                                return (
                                                    <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-lg border">
                                                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                                                            {product?.image_url ? (
                                                                <img 
                                                                    src={product.image_url} 
                                                                    alt={product.name || ''} 
                                                                    className="w-12 h-12 object-cover rounded self-start sm:self-center"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : item.image_url ? (
                                                                <img 
                                                                    src={item.image_url} 
                                                                    alt={item.product_name || ''} 
                                                                    className="w-12 h-12 object-cover rounded self-start sm:self-center"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm sm:text-base truncate">
                                                                    {product?.name || item.product_name || item.product_id}
                                                                </p>
                                                                <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                                            <Label htmlFor={`product_price_${q.id}_${idx}`} className="text-xs sm:text-sm">
                                                                Price per unit (₹):
                                                            </Label>
                                                            <div className="flex items-center space-x-2">
                                                                <Input
                                                                    id={`product_price_${q.id}_${idx}`}
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    className="w-20 sm:w-24 h-8 sm:h-10 text-sm"
                                                                    value={formStates[q.id]?.product_prices?.[idx] || ''}
                                                                    onChange={(e) => handleProductPriceChange(q.id, idx, e.target.value)}
                                                                />
                                                                <span className="text-xs sm:text-sm text-gray-500">
                                                                    Total: ₹{((formStates[q.id]?.product_prices?.[idx] || 0) * (item.quantity || 1)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-gray-500 text-sm">No items specified</p>
                                            )}
                                        </div>
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-blue-800 text-sm sm:text-base">Total Product Cost:</span>
                                                <span className="font-bold text-base sm:text-lg text-blue-800">
                                                    ₹{calculateTotalProductCost(q.id, q.items || []).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Additional Costs</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor={`transport_cost_${q.id}`} className="text-xs sm:text-sm">Transport Cost (₹)</Label>
                                                <Input
                                                    id={`transport_cost_${q.id}`}
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="h-8 sm:h-10 text-sm"
                                                    value={formStates[q.id]?.transport_cost || ''}
                                                    onChange={(e) => handleInputChange(q.id, 'transport_cost', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`custom_work_cost_${q.id}`} className="text-xs sm:text-sm">Custom Work Cost (₹)</Label>
                                                <Input
                                                    id={`custom_work_cost_${q.id}`}
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="h-8 sm:h-10 text-sm"
                                                    value={formStates[q.id]?.custom_work_cost || ''}
                                                    onChange={(e) => handleInputChange(q.id, 'custom_work_cost', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`delivery_days_${q.id}`} className="text-xs sm:text-sm">Estimated Delivery Days</Label>
                                                <Input
                                                    id={`delivery_days_${q.id}`}
                                                    type="number"
                                                    placeholder="7"
                                                    className="h-8 sm:h-10 text-sm"
                                                    value={formStates[q.id]?.estimated_delivery_days || ''}
                                                    onChange={(e) => handleInputChange(q.id, 'estimated_delivery_days', e.target.value)}
                                                />
                                            </div>
                                            <div className="p-3 bg-green-50 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-green-800 text-sm sm:text-base">Total Quote Price:</span>
                                                    <span className="font-bold text-base sm:text-lg text-green-800">
                                                        ₹{(calculateTotalProductCost(q.id, q.items || []) + 
                                                           parseFloat(formStates[q.id]?.transport_cost || '0') + 
                                                           parseFloat(formStates[q.id]?.custom_work_cost || '0')).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                                <Button 
                                                    onClick={() => handleSubmitQuote(q)}
                                                    disabled={submitting === q.id}
                                                    className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                                                >
                                                    {submitting === q.id ? 'Submitting...' : 'Submit Quote'}
                                                </Button>
                                                <Button 
                                                    onClick={() => handleCloseQuotation(q.id)}
                                                    disabled={submitting === q.id}
                                                    variant="outline"
                                                    className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                                                >
                                                    {submitting === q.id ? 'Closing...' : 'Close Quotation'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

const MySubmittedQuotations: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [myQuotations, setMyQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [productMap, setProductMap] = useState<{ [id: string]: any }>({});
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const prevApprovedIds = useRef<Set<string>>(new Set());
    const [closingQuotation, setClosingQuotation] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        const fetchMyQuotations = async () => {
            setLoading(true);
            if (!merchantCode) {
                setLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('quotations')
                .select('*')
                .eq('merchant_code', merchantCode)
                .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed'])
                .order('created_at', { ascending: false });
            if (!error && data) {
                setMyQuotations(data);
                const approvedNow = data.filter((q: any) => q.status === 'approved');
                const newApproved = approvedNow.filter((q: any) => !prevApprovedIds.current.has(q.id));
                if (newApproved.length > 0) {
                    setToastMsg(`🎉 ${newApproved.length} quotation(s) approved!`);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                }
                prevApprovedIds.current = new Set(approvedNow.map((q: any) => q.id));
                const allProductIds = Array.from(new Set(
                    data.flatMap((q: any) => Array.isArray(q.items) ? q.items.map((item: any) => item.product_id) : [])
                ));
                if (allProductIds.length > 0) {
                    const { data: productsData, error: productsError } = await supabase
                        .from('products')
                        .select('id, name, image_url')
                        .in('id', allProductIds);
                    if (!productsError && productsData) {
                        const map: { [id: string]: any } = {};
                        productsData.forEach((p: any) => { map[p.id] = p; });
                        setProductMap(map);
                    }
                }
            }
            setLoading(false);
        };
        fetchMyQuotations();
    }, [merchantCode]);

    const handleCloseQuotation = async (quotationId: string) => {
        setClosingQuotation(quotationId);
        
        try {
            const { error } = await supabase
                .from('quotations')
                .update({ 
                    status: 'closed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', quotationId)
                .eq('merchant_code', merchantCode);
            
            if (error) {
                console.error('Error closing quotation:', error);
                alert('Failed to close quotation: ' + error.message);
            } else {
                const { data: updatedData } = await supabase
                    .from('quotations')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed'])
                    .order('created_at', { ascending: false });
                
                setMyQuotations(updatedData || []);
                setToastMsg('✅ Quotation closed successfully!');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }
        } catch (err) {
            console.error('Error closing quotation:', err);
            alert('Failed to close quotation');
        } finally {
            setClosingQuotation(null);
        }
    };

    const filteredQuotations = statusFilter === 'all'
        ? myQuotations
        : myQuotations.filter((q: any) => q.status === statusFilter);

    return (
        <div className="space-y-4">
            {showToast && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg z-50 text-sm">
                    {toastMsg}
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Label htmlFor="statusFilter" className="text-sm">Filter by Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="waiting_for_admin">Waiting for Admin</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading your submitted quotations...</p>
                </div>
            ) : filteredQuotations.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No submitted quotations found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuotations.map((q) => (
                        <Card key={q.id} className={`overflow-hidden ${
                            q.status === 'approved' ? 'border-green-200 bg-green-50' :
                            q.status === 'closed' ? 'border-gray-200 bg-gray-50' : ''
                        }`}>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start space-y-2 sm:space-y-0">
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="text-base sm:text-lg truncate">Quotation #{q.quotation_code}</CardTitle>
                                        <CardDescription className="text-sm">User ID: {q.user_id}</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                        {q.status === 'waiting_for_admin' && (
                                            <Badge variant="secondary" className="text-xs">⏳ Waiting for Admin</Badge>
                                        )}
                                        {q.status === 'approved' && (
                                            <Badge className="bg-green-100 text-green-800 text-xs">✅ APPROVED</Badge>
                                        )}
                                        {q.status === 'rejected' && (
                                            <Badge variant="destructive" className="text-xs">❌ Rejected</Badge>
                                        )}
                                        {q.status === 'closed' && (
                                            <Badge variant="outline" className="text-xs">🔒 Closed</Badge>
                                        )}
                                        {q.status !== 'closed' && (
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleCloseQuotation(q.id)}
                                                disabled={closingQuotation === q.id}
                                                className="text-xs h-8"
                                            >
                                                {closingQuotation === q.id ? 'Closing...' : 'Close'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Items</h4>
                                        <div className="space-y-2">
                                            {Array.isArray(q.items) ? q.items.map((item: any, idx: number) => {
                                                let productId = undefined;
                                                if (typeof item === 'string' || typeof item === 'number') {
                                                    productId = item;
                                                } else if (typeof item === 'object' && item !== null) {
                                                    productId = item.product_id || item.id;
                                                }
                                                const product = productMap[productId];
                                                return (
                                                    <div key={idx} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                                                        {product?.image_url && (
                                                            <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm sm:text-base truncate">{product?.name || productId}</p>
                                                            <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity || item.qty || (typeof item === 'number' ? 1 : '')}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-gray-500 text-sm">No items specified</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Quote Details</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 text-sm">Product Cost:</span>
                                                <span className="font-medium text-sm">₹{q.product_cost || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 text-sm">Transport Cost:</span>
                                                <span className="font-medium text-sm">₹{q.transport_cost || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 text-sm">Custom Work:</span>
                                                <span className="font-medium text-sm">₹{q.custom_work_cost || '-'}</span>
                                            </div>
                                            <div className="border-t pt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-sm sm:text-base">Total Price:</span>
                                                    <span className="font-bold text-base sm:text-lg">₹{q.total_quote_price || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-500">
                                                Delivery: {q.estimated_delivery_days || '-'} days
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MerchantDashboard; 