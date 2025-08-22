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
import ImageUpload from "@/components/ui/ImageUpload";
import { 
    Store, 
    FileText, 
    Package, 
    TrendingUp, 
    AlertCircle,
    CheckCircle,
    Clock,
    DollarSign,
    BarChart3,
    Settings,
    Activity,
    ShoppingCart,
    Users,
    Calendar,
    Target,
    X
} from 'lucide-react';

const MerchantDashboard: React.FC = () => {
    const [merchantStatus, setMerchantStatus] = useState<string>('pending');
    const [merchantCode, setMerchantCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableQuotesCount, setAvailableQuotesCount] = useState<number>(0);
    const [submittedQuotesCount, setSubmittedQuotesCount] = useState<number>(0);
    const [userEmail, setUserEmail] = useState<string>('');
    const navigate = useNavigate();

    const handleCloseDashboard = () => {
        navigate('/');
    };

    useEffect(() => {
        const fetchMerchantStatus = async () => {
            setLoading(true);
            try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            
            setUserEmail(user.email || '');

            const { data: merchantData, error } = await supabase
                .from('merchants')
                .select('status, merchant_code')
                .eq('email', user.email)
                .single();

            if (!error && merchantData) {
                setMerchantStatus(merchantData.status);
                // Validate merchant code before setting it
                if (merchantData.merchant_code && typeof merchantData.merchant_code === 'string') {
                    setMerchantCode(merchantData.merchant_code.trim());
                } else {
                    console.error('Invalid merchant code:', merchantData.merchant_code);
                    setMerchantCode(null);
                }
            }
            } catch (error) {
                console.error('Error fetching merchant status:', error);
            } finally {
            setLoading(false);
            }
        };
        fetchMerchantStatus();
    }, [navigate]);

    // Fetch counts for stats cards
    useEffect(() => {
        const fetchCounts = async () => {
            if (!merchantCode || !merchantCode.trim()) {
                return;
            }
            
            try {
                // Fetch available quotes count
                const { data: pendingQuotations } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('status', 'pending');
                
                const { data: merchantQuotations } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
                
                const processedCodes = new Set(merchantQuotations?.map((q: any) => q.quotation_code) || []);
                const availableCount = pendingQuotations?.filter((q: any) => 
                    !processedCodes.has(q.quotation_code)
                ).length || 0;
                
                setAvailableQuotesCount(availableCount);
                
                // Fetch submitted quotes count
                const { data: submittedQuotations } = await supabase
                    .from('quotations')
                    .select('id')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
                
                setSubmittedQuotesCount(submittedQuotations?.length || 0);
                
            } catch (error) {
                console.error('Error fetching counts:', error);
            }
        };
        
        fetchCounts();
    }, [merchantCode]);

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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Merchant Dashboard</h1>
                            <p className="text-gray-600 text-lg">Manage your nursery business and quotations</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCloseDashboard}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Close
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Merchant Code</p>
                                    <p className="text-2xl font-bold font-mono">{merchantCode}</p>
                                </div>
                                <Store className="w-12 h-12 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Account Status</p>
                                    <p className="text-2xl font-bold">Approved</p>
                                </div>
                                <CheckCircle className="w-12 h-12 text-green-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm font-medium">Available Quotes</p>
                                    <p className="text-2xl font-bold">{availableQuotesCount}</p>
                                </div>
                                <FileText className="w-12 h-12 text-orange-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Submitted Quotes</p>
                                    <p className="text-2xl font-bold">{submittedQuotesCount}</p>
                                </div>
                                <Target className="w-12 h-12 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
                        <TabsTrigger value="overview" className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="quotations" className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>Available Quotes</span>
                        </TabsTrigger>
                        <TabsTrigger value="submitted" className="flex items-center space-x-2">
                            <Target className="w-4 h-4" />
                            <span>My Submissions</span>
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex items-center space-x-2">
                            <Package className="w-4 h-4" />
                            <span>Products</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Orders */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        <span>Recent Orders</span>
                                    </CardTitle>
                                    <CardDescription>Latest orders from customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                                    <RecentOrders merchantCode={merchantCode} />
                        </CardContent>
                    </Card>

                            {/* Pending Reviews */}
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <AlertCircle className="w-5 h-5" />
                                        <span>Pending Reviews</span>
                                    </CardTitle>
                                    <CardDescription>Quotations waiting for approval</CardDescription>
                        </CardHeader>
                        <CardContent>
                                    <PendingReviews merchantCode={merchantCode} />
                        </CardContent>
                    </Card>
                </div>
                    </TabsContent>

                    {/* Available Quotations Tab */}
                    <TabsContent value="quotations" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5" />
                                    <span>Available Quotations</span>
                                </CardTitle>
                                <CardDescription>Review and submit quotes for user requests</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MerchantQuotations merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* My Submissions Tab */}
                    <TabsContent value="submitted" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Target className="w-5 h-5" />
                                    <span>My Submitted Quotations</span>
                                </CardTitle>
                                <CardDescription>Track the status of your submitted quotes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MySubmittedQuotations merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Products Tab */}
                    <TabsContent value="products" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Package className="w-5 h-5" />
                                    <span>Product Management</span>
                                </CardTitle>
                                <CardDescription>Manage your product catalog and inventory</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ProductManagement merchantEmail={userEmail} />
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
        available_quantity: '',
        image_url: '',
        description: '',
        about: '',
        care_instructions: '',
        specifications: '',
        categories: ''
    });

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
                .eq('merchant_email', merchantEmail);
        if (!error) setProducts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [merchantEmail]);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Debug logging
        console.log('Adding product with data:', formData);
        console.log('Merchant email:', merchantEmail);
        
        // Validate required fields
        if (!formData.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Product name is required.",
                variant: "destructive"
            });
            return;
        }
        
        if (!formData.available_quantity || parseInt(formData.available_quantity) <= 0) {
            toast({
                title: "Validation Error",
                description: "Available quantity must be greater than 0.",
                variant: "destructive"
            });
            return;
        }
        
        const productData = {
            name: formData.name.trim(),
                available_quantity: parseInt(formData.available_quantity),
            image_url: formData.image_url || null,
            description: formData.description || null,
            about: formData.about || null,
            care_instructions: formData.care_instructions || null,
            specifications: formData.specifications || null,
            categories: formData.categories || null,
                merchant_email: merchantEmail
        };
        
        console.log('Product data to insert:', productData);
        
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select();
            
        console.log('Insert result:', { data, error });
        
        if (!error) {
            setShowAddDialog(false);
            setFormData({ name: '', available_quantity: '', image_url: '', description: '', about: '', care_instructions: '', specifications: '', categories: '' });
            fetchProducts();
            toast({
                title: "Product Added ✅",
                description: "Product has been added successfully.",
                variant: "default"
            });
        } else {
            console.error('Error adding product:', error);
            toast({
                title: "Error ❌",
                description: error.message || "Failed to add product. Please try again.",
                variant: "destructive"
            });
        }
    };

    const openEditDialog = (product: any) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            available_quantity: product.available_quantity.toString(),
            image_url: product.image_url || '',
            description: product.description || '',
            about: product.about || '',
            care_instructions: product.care_instructions || '',
            specifications: product.specifications || '',
            categories: product.categories || ''
        });
        setShowAddDialog(true);
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('products')
            .update({
                name: formData.name,
                available_quantity: parseInt(formData.available_quantity),
                image_url: formData.image_url,
                description: formData.description,
                about: formData.about,
                care_instructions: formData.care_instructions,
                specifications: formData.specifications,
                categories: formData.categories
            })
            .eq('id', editingProduct.id);
        if (!error) {
            setShowAddDialog(false);
            setEditingProduct(null);
            setFormData({ name: '', available_quantity: '', image_url: '', description: '', about: '', care_instructions: '', specifications: '', categories: '' });
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
                                <CardDescription className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {product.categories || 'Uncategorized'}
                                </span>
                                        <span>•</span>
                                        <span>{product.available_quantity} in stock</span>
                                    </div>
                                    {product.description && (
                                        <p className="text-gray-600 text-xs line-clamp-2">
                                            {product.description}
                                        </p>
                                    )}
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
                            <form 
                                onSubmit={(e) => {
                                    console.log('Form submitted!');
                                    console.log('Editing product:', editingProduct);
                                    if (editingProduct) {
                                        handleEditProduct(e);
                                    } else {
                                        handleAddProduct(e);
                                    }
                                }} 
                                className="space-y-4"
                            >
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
                                <ImageUpload
                                    currentImageUrl={formData.image_url}
                                    onImageUpload={(imageUrl) => setFormData({...formData, image_url: imageUrl})}
                                    onImageRemove={() => setFormData({...formData, image_url: ''})}
                                    productId={editingProduct?.id}
                                />
                                
                                <div>
                                    <Label htmlFor="categories" className="text-sm">Categories</Label>
                                    <select
                                        id="categories"
                                        value={formData.categories}
                                        onChange={(e) => setFormData({...formData, categories: e.target.value})}
                                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select a category</option>
                                        <option value="indoor-plants">Indoor Plants</option>
                                        <option value="outdoor-plants">Outdoor Plants</option>
                                        <option value="flowering-plants">Flowering Plants</option>
                                        <option value="succulents">Succulents & Cacti</option>
                                        <option value="trees">Trees & Shrubs</option>
                                        <option value="herbs">Herbs & Vegetables</option>
                                        <option value="aquatic">Aquatic Plants</option>
                                        <option value="medicinal">Medicinal Plants</option>
                                        <option value="ornamental">Ornamental Plants</option>
                                        <option value="seasonal">Seasonal Plants</option>
                                        <option value="bamboo">Bamboo Plants</option>
                                        <option value="climbers">Climbers & Creepers</option>
                                        <option value="grass">Grasses & Ground Covers</option>
                                        <option value="exotic">Exotic Plants</option>
                                        <option value="air-purifying">Air Purifying Plants</option>
                                        <option value="grafted">Grafted Varieties</option>
                                        <option value="shade">Shade Trees</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <Label htmlFor="description" className="text-sm">Description</Label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Brief description of the product..."
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="about" className="text-sm">About</Label>
                                    <textarea
                                        id="about"
                                        value={formData.about}
                                        onChange={(e) => setFormData({...formData, about: e.target.value})}
                                        className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Detailed information about the product..."
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="specifications" className="text-sm">Specifications</Label>
                                    <textarea
                                        id="specifications"
                                        value={formData.specifications}
                                        onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                                        className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Technical specifications, dimensions, etc..."
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="care_instructions" className="text-sm">Care Instructions</Label>
                                    <textarea
                                        id="care_instructions"
                                        value={formData.care_instructions}
                                        onChange={(e) => setFormData({...formData, care_instructions: e.target.value})}
                                        className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Watering, sunlight, soil requirements, etc..."
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <Button 
                                        type="submit" 
                                        className="flex-1 h-10 text-sm"
                                        onClick={() => console.log('Submit button clicked!')}
                                    >
                                        {editingProduct ? 'Update Product' : 'Add Product'}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddDialog(false);
                                            setEditingProduct(null);
                                            setFormData({ name: '', available_quantity: '', image_url: '', description: '', about: '', care_instructions: '', specifications: '', categories: '' });
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
            if (!merchantCode || !merchantCode.trim()) {
                setLoading(false);
                return;
            }
            try {
            const { data: pendingQuotations, error: pendingError } = await supabase
                .from('quotations')
                .select('*')
                    .eq('status', 'pending');
            if (pendingError) {
                console.error('Error fetching pending quotations:', pendingError);
                setLoading(false);
                return;
            }
                
                // Only query merchant quotations if merchantCode is valid
                let merchantQuotations = [];
                if (merchantCode && merchantCode.trim()) {
                    const { data: merchantData, error: merchantError } = await supabase
                .from('quotations')
                .select('quotation_code')
                .eq('merchant_code', merchantCode)
                .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
            if (merchantError) {
                console.error('Error fetching merchant quotations:', merchantError);
                    } else {
                        merchantQuotations = merchantData || [];
            }
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
            } catch (error) {
                console.error('Error fetching quotations:', error);
                setLoading(false);
            }
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
                unit_prices: {
                    ...prev[quotationId]?.unit_prices,
                    [productIndex]: parseFloat(price) || 0
                }
            }
        }));
    };

    const calculateTotalProductCost = (quotationId: string, items: any[]) => {
        const unitPrices = formStates[quotationId]?.unit_prices || {};
        return items.reduce((total, item, index) => {
            const price = unitPrices[index] || 0;
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
        
        if (!merchantCode || !merchantCode.trim()) {
            console.error('Invalid merchant code. Current merchantCode state:', merchantCode);
            alert('Invalid merchant code. Please refresh the page and try again.');
            setSubmitting(null);
            return;
        }
        
        console.log('Creating new merchant quotation with merchant_code:', merchantCode);
        console.log('Form data being sent:', {
            unit_prices: form.unit_prices,
            transport_cost,
            custom_work_cost,
            estimated_delivery_days,
            total_quote_price
        });
        
        const newId = crypto.randomUUID();
        const { error: insertError } = await supabase
            .from('quotations')
            .insert([{
                id: newId,
                quotation_code: q.quotation_code,
                user_id: q.user_id,
                items: q.items,
                product_cost: total_product_cost,
                unit_prices: form.unit_prices ? JSON.stringify(Object.values(form.unit_prices)) : null,
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
            .eq('status', 'pending');
            
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
                                                                    value={formStates[q.id]?.unit_prices?.[idx] || ''}
                                                                    onChange={(e) => handleProductPriceChange(q.id, idx, e.target.value)}
                                                                />
                                                                <span className="text-xs sm:text-sm text-gray-500">
                                                                    Total: ₹{((formStates[q.id]?.unit_prices?.[idx] || 0) * (item.quantity || 1)).toFixed(2)}
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
            if (!merchantCode || !merchantCode.trim()) {
                setLoading(false);
                return;
            }
            try {
                console.log('Fetching quotations for merchant code:', merchantCode);
                const { data, error } = await supabase
                    .from('quotations')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
                
                console.log('Quotations query result:', { data, error });
                
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
                console.log('Product IDs found:', allProductIds);
                
                if (allProductIds.length > 0) {
                    // Filter out non-UUID product IDs
                    const validProductIds = allProductIds.filter(id => 
                        typeof id === 'string' && id.length === 36 && id.includes('-')
                    );
                    console.log('Valid product IDs:', validProductIds);
                    
                    if (validProductIds.length > 0) {
                        const { data: productsData, error: productsError } = await supabase
                            .from('products')
                            .select('id, name, image_url')
                            .in('id', validProductIds);
                        console.log('Products data:', productsData);
                        console.log('Products error:', productsError);
                        
                        if (!productsError && productsData) {
                            const map: { [id: string]: any } = {};
                            productsData.forEach((p: any) => { map[p.id] = p; });
                            setProductMap(map);
                            console.log('Product map created:', map);
                        }
                    }
                }
            }
            } catch (error) {
                console.error('Error fetching my quotations:', error);
            } finally {
            setLoading(false);
            }
        };
        fetchMyQuotations();
    }, [merchantCode]);

    const handleCloseQuotation = async (quotationId: string) => {
        setClosingQuotation(quotationId);
        
        if (!merchantCode || !merchantCode.trim()) {
            console.error('Invalid merchant code for closing quotation');
            setClosingQuotation(null);
            return;
        }
        
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
                const { data: updatedData, error: fetchError } = await supabase
                    .from('quotations')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['waiting_for_admin', 'approved', 'rejected', 'closed']);
                
                if (!fetchError) {
                setMyQuotations(updatedData || []);
                }
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

// Recent Orders Component
const RecentOrders: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentOrders = async () => {
            if (!merchantCode || !merchantCode.trim()) {
                setLoading(false);
                return;
            }
            
            try {
                // Fetch orders related to this merchant's quotations
                const { data: quotations } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('merchant_code', merchantCode)
                    .in('status', ['approved', 'delivered']);
                
                if (quotations && quotations.length > 0) {
                    const quotationCodes = quotations.map(q => q.quotation_code);
                    
                    // Fetch orders that match these quotation codes
                    const { data: ordersData } = await supabase
                        .from('orders')
                        .select('*')
                        .in('quotation_code', quotationCodes)
                        .limit(5);
                    
                    setOrders(ordersData || []);
                }
            } catch (error) {
                console.error('Error fetching recent orders:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchRecentOrders();
    }, [merchantCode]);

    if (loading) {
        return <div className="text-center py-4">Loading orders...</div>;
    }

    if (orders.length === 0) {
        return <div className="text-center py-4 text-gray-500">No orders found</div>;
    }

    return (
        <div className="space-y-3">
            {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Order #{order.id}</p>
                        <p className="text-sm text-gray-500">₹{order.total_amount || 0}</p>
                    </div>
                    <Badge variant={
                        order.status === 'delivered' ? 'default' :
                        order.status === 'processing' ? 'secondary' :
                        'outline'
                    }>
                        {order.status || 'pending'}
                    </Badge>
                </div>
            ))}
        </div>
    );
};

// Pending Reviews Component
const PendingReviews: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [pendingQuotations, setPendingQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPendingReviews = async () => {
            if (!merchantCode || !merchantCode.trim()) {
                setLoading(false);
                return;
            }
            
            try {
                // Fetch quotations that are waiting for admin review
                const { data: quotations } = await supabase
                    .from('quotations')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .eq('status', 'waiting_for_admin')
                    .limit(5);
                
                setPendingQuotations(quotations || []);
            } catch (error) {
                console.error('Error fetching pending reviews:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchPendingReviews();
    }, [merchantCode]);

    if (loading) {
        return <div className="text-center py-4">Loading reviews...</div>;
    }

    if (pendingQuotations.length === 0) {
        return <div className="text-center py-4 text-gray-500">No pending reviews</div>;
    }

    return (
        <div className="space-y-3">
            {pendingQuotations.map((quotation) => (
                <div key={quotation.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">{quotation.quotation_code}</p>
                        <p className="text-sm text-gray-500">{quotation.merchant_code}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                        Review Needed
                    </Badge>
                </div>
            ))}
        </div>
    );
};

export default MerchantDashboard; 