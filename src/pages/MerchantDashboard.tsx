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
    X,
    AlertTriangle,
    Truck,
    XCircle,
    Star,
    MessageSquare,
    User,
    RefreshCw
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
                // Fetch available quotes count using improved filtering
                const { data: pendingQuotations } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('status', 'pending')
                    .eq('is_user_request', true);
                
                const { data: merchantQuotations } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('merchant_code', merchantCode)
                    .eq('is_user_request', false);
                
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
                    .eq('is_user_request', false);
                
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

    if (merchantStatus === 'blocked') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-red-600">🚫 Dashboard Access Blocked</CardTitle>
                        <CardDescription className="text-center">
                            Your dashboard access has been blocked by Admin. Please contact support.
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
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Merchant Dashboard</h1>
                            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Manage your nursery business and quotations</p>
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

                {/* Dashboard Overview Cards */}
                <DashboardOverview merchantCode={merchantCode} />

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
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
                    <TabsList className="flex flex-wrap w-full bg-white shadow-lg overflow-x-auto">
                        <TabsTrigger value="overview" className="flex items-center space-x-2 whitespace-nowrap">
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="quotations" className="flex items-center space-x-2 whitespace-nowrap">
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Available Quotes</span>
                        </TabsTrigger>
                        <TabsTrigger value="submitted" className="flex items-center space-x-2 whitespace-nowrap">
                            <Target className="w-4 h-4" />
                            <span className="hidden sm:inline">My Submissions</span>
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex items-center space-x-2 whitespace-nowrap">
                            <Package className="w-4 h-4" />
                            <span className="hidden sm:inline">Products</span>
                        </TabsTrigger>
                        <TabsTrigger value="orders" className="flex items-center space-x-2 whitespace-nowrap">
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline">Orders</span>
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="flex items-center space-x-2 whitespace-nowrap">
                            <TrendingUp className="w-4 h-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="flex items-center space-x-2 whitespace-nowrap">
                            <Star className="w-4 h-4" />
                            <span className="hidden sm:inline">Reviews</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
                                <ProductManagement merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Orders Tab */}
                    <TabsContent value="orders" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    <span>Order Management</span>
                                </CardTitle>
                                <CardDescription>Track and manage customer orders</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <OrderManagement merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <TrendingUp className="w-5 h-5" />
                                    <span>Analytics & Insights</span>
                                </CardTitle>
                                <CardDescription>View your business performance and trends</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Analytics merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Reviews Tab */}
                    <TabsContent value="reviews" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Star className="w-5 h-5" />
                                    <span>Customer Reviews</span>
                                </CardTitle>
                                <CardDescription>View and respond to customer feedback</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Reviews merchantCode={merchantCode} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

const ProductManagement: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
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
        if (!merchantCode || !merchantCode.trim()) {
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('products')
            .select('*')
                .eq('merchant_code', merchantCode);
        if (!error) setProducts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [merchantCode]);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!merchantCode || !merchantCode.trim()) {
            toast({
                title: "Error ❌",
                description: "Merchant code not available. Please refresh the page.",
                variant: "destructive"
            });
            return;
        }
        
        // Debug logging
        console.log('Adding product with data:', formData);
        console.log('Merchant code:', merchantCode);
        
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
                merchant_code: merchantCode
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
                                    <Label htmlFor="categories" className="text-sm">Category</Label>
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
                // Fetch all pending quotations (user requests)
                const { data: pendingQuotations, error: pendingError } = await supabase
                    .from('quotations')
                    .select('*')
                    .eq('status', 'pending')
                    .eq('is_user_request', true);
                    
                if (pendingError) {
                    console.error('Error fetching pending quotations:', pendingError);
                    setLoading(false);
                    return;
                }
                
                // Fetch all quotations that this merchant has already submitted
                const { data: merchantQuotations, error: merchantError } = await supabase
                    .from('quotations')
                    .select('quotation_code')
                    .eq('merchant_code', merchantCode)
                    .eq('is_user_request', false);
                    
                if (merchantError) {
                    console.error('Error fetching merchant quotations:', merchantError);
                    setLoading(false);
                    return;
                }
                
                // Create a set of quotation codes that this merchant has already responded to
                const processedQuotationCodes = new Set(
                    merchantQuotations?.map((q: any) => q.quotation_code) || []
                );
                
                // Filter out quotations that the merchant has already responded to
                const availableQuotations = pendingQuotations?.filter((q: any) =>
                    !processedQuotationCodes.has(q.quotation_code)
                ) || [];
                
                setQuotations(availableQuotations);
            
            // Fetch products for all items in quotations
            const allProductIds = Array.from(new Set(
                availableQuotations.flatMap((q: any) => 
                    Array.isArray(q.items) ? q.items.map((item: any) => item.product_id) : []
                )
            )).filter(id => id !== undefined && id !== null); // Filter out undefined and null values
            
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
        console.log('Input change:', { id, field, value });
        setFormStates(prev => {
            const newState = {
                ...prev,
                [id]: {
                    ...prev[id],
                    [field]: value
                }
            };
            console.log('New form state:', newState);
            return newState;
        });
    };

    const handleProductPriceChange = (quotationId: string, productIndex: number, price: string) => {
        console.log('Product price change:', { quotationId, productIndex, price });
        setFormStates(prev => {
            const newState = {
                ...prev,
                [quotationId]: {
                    ...prev[quotationId],
                    unit_prices: {
                        ...prev[quotationId]?.unit_prices,
                        [productIndex]: price // Store as string, convert to number later
                    }
                }
            };
            console.log('New form state after product price change:', newState);
            return newState;
        });
    };

    const calculateTotalProductCost = (quotationId: string, items: any[]) => {
        const unitPrices = formStates[quotationId]?.unit_prices || {};
        return items.reduce((total, item, index) => {
            const price = parseFloat(unitPrices[index]) || 0;
            const quantity = item.quantity || 1;
            return total + (price * quantity);
        }, 0);
    };

    const handleSubmitQuote = async (q: any) => {
        setSubmitting(q.id);
        const form = formStates[q.id] || {};
        
        // Ensure all numeric values are properly converted with fallbacks
        const transport_cost = 0; // Merchants cannot set transport cost
        const custom_work_cost = 0; // Merchants cannot set custom work cost
        const estimated_delivery_days = parseInt(form.estimated_delivery_days || '7') || 7;
        
        console.log('Parsed numeric values:', {
            transport_cost,
            custom_work_cost,
            estimated_delivery_days,
            original_values: {
                transport_cost: form.transport_cost,
                custom_work_cost: form.custom_work_cost,
                estimated_delivery_days: form.estimated_delivery_days
            }
        });
        
        if (!merchantCode || !merchantCode.trim()) {
            console.error('Invalid merchant code. Current merchantCode state:', merchantCode);
            alert('Invalid merchant code. Please refresh the page and try again.');
            setSubmitting(null);
            return;
        }
        
        console.log('Submitting merchant quotation with merchant_code:', merchantCode);
        console.log('Form data being sent:', {
            unit_prices: form.unit_prices,
            transport_cost,
            custom_work_cost,
            estimated_delivery_days
        });
        
        // Use the new submit_merchant_quotation function
        try {
            // Convert unit_prices to proper JSONB format
            const unitPricesArray = [];
            if (form.unit_prices && Object.keys(form.unit_prices).length > 0) {
                // Convert all unit prices to numbers and create array
                for (let i = 0; i < Object.keys(form.unit_prices).length; i++) {
                    const price = parseFloat(form.unit_prices[i]) || 0;
                    unitPricesArray.push(price);
                }
            }
            
            console.log('Form data being processed:', {
                original_unit_prices: form.unit_prices,
                converted_unit_prices: unitPricesArray,
                transport_cost: transport_cost,
                custom_work_cost: custom_work_cost,
                estimated_delivery_days: estimated_delivery_days
            });
            
            console.log('Sending data to function:', {
                p_quotation_code: q.quotation_code,
                p_merchant_code: merchantCode,
                p_unit_prices: unitPricesArray,
                p_transport_cost: transport_cost,
                p_custom_work_cost: custom_work_cost,
                p_estimated_delivery_days: estimated_delivery_days
            });
            
            // Try the simple function first, if it fails, use the final function
            let data, error;
            
            try {
                const result = await supabase.rpc('submit_merchant_quotation_simple', {
                    p_quotation_code: q.quotation_code,
                    p_merchant_code: merchantCode,
                    p_unit_prices: unitPricesArray, // Supabase will convert array to JSONB automatically
                    p_transport_cost: transport_cost,
                    p_custom_work_cost: custom_work_cost,
                    p_estimated_delivery_days: estimated_delivery_days
                });
                data = result.data;
                error = result.error;
            } catch (simpleError) {
                console.log('Simple function failed, trying final function:', simpleError);
                
                // Use the final function that accepts all parameters as TEXT
                const result = await supabase.rpc('submit_merchant_quotation_final', {
                    p_quotation_code: q.quotation_code,
                    p_merchant_code: merchantCode,
                    p_unit_prices: JSON.stringify(unitPricesArray), // Send as JSON string
                    p_transport_cost: transport_cost.toString(),
                    p_custom_work_cost: custom_work_cost.toString(),
                    p_estimated_delivery_days: estimated_delivery_days.toString()
                });
                data = result.data;
                error = result.error;
            }
                
            if (error) {
                console.error('Failed to submit merchant quotation:', error);
                setSubmitting(null);
                alert('Failed to submit quote: ' + error.message);
                return;
            }
            
            if (!data || !data.success) {
                console.error('Failed to submit merchant quotation:', data?.message);
                setSubmitting(null);
                alert('Failed to submit quote: ' + (data?.message || 'Unknown error'));
                return;
            }
        } catch (catchError) {
            console.error('Exception during merchant quotation submission:', catchError);
            setSubmitting(null);
            alert('Failed to submit quote: Failed to submit merchant quotation');
            return;
        }
        
        setSubmitting(null);
        
        // Refresh available quotations using the same improved filtering logic
        const { data: pendingQuotations } = await supabase
            .from('quotations')
            .select('*')
            .eq('status', 'pending')
            .eq('is_user_request', true);
            
        const { data: merchantQuotations } = await supabase
            .from('quotations')
            .select('quotation_code')
            .eq('merchant_code', merchantCode)
            .eq('is_user_request', false);
            
        const processedQuotationCodes = new Set(
            merchantQuotations?.map((mq: any) => mq.quotation_code) || []
        );
        
        const availableQuotations = pendingQuotations?.filter((q: any) => 
            !processedQuotationCodes.has(q.quotation_code)
        ) || [];
        
        setQuotations(availableQuotations);
        setFormStates(prev => ({ ...prev, [q.id]: {} }));
        
        toast({
            title: "Quote Submitted!",
            description: `Quote submitted successfully for: ${q.quotation_code}. User will be notified of your pricing.`,
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
                                        <div className="space-y-4">
                                            {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                // Debug: Log the item data to see what's available
                                                console.log('Item data for merchant display:', item);
                                                let productId = undefined;
                                                let product = null;
                                                
                                                if (typeof item === 'string' || typeof item === 'number') {
                                                    productId = item;
                                                    product = productMap[productId];
                                                } else if (typeof item === 'object' && item !== null) {
                                                    productId = item.product_id;
                                                    // Only try to look up product if we have a valid product ID
                                                    if (productId && productId !== 'null' && productId !== null) {
                                                        product = productMap[productId];
                                                    }
                                                }
                                                
                                                // Determine if this is a catalog quotation (no product_id) or individual shop product
                                                const isCatalogQuotation = !productId || productId === 'null' || productId === null;
                                                return (
                                                    <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                                        {/* Product Header */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                                                            {(product?.image_url || item.image || item.image_url) ? (
                                                                <img 
                                                                    src={product?.image_url || item.image || item.image_url} 
                                                                    alt={isCatalogQuotation ? (item.product_name || item.name || item.title || item.plant_name || item.variety || '') : (product?.name || item.name || item.title || '')} 
                                                                    className="w-16 h-16 object-cover rounded-lg self-start sm:self-center"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-lg text-gray-800 mb-1">
                                                                    {isCatalogQuotation ? (
                                                                        item.product_name || 
                                                                        item.name || 
                                                                        item.title ||
                                                                        item.plant_name ||
                                                                        item.variety ||
                                                                        `Product ${idx + 1}`
                                                                    ) : (
                                                                        product?.name || 
                                                                        item.name || 
                                                                        item.title ||
                                                                        item.product_id ||
                                                                        `Product ${idx + 1}`
                                                                    )}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 mb-2">
                                                                    Quantity: <span className="font-medium text-blue-600">{item.quantity}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Comprehensive Plant Details */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            {/* Plant Information */}
                                                            <div className="space-y-2">
                                                                <h5 className="font-medium text-gray-700 text-sm">Plant Information</h5>
                                                                <div className="space-y-1 text-sm">
                                                                    {item.variety && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Variety:</span>
                                                                            <span className="font-medium">{item.variety}</span>
                                                                    </div>
                                                                )}
                                                                    {item.plant_type && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Type:</span>
                                                                            <span className="font-medium">{item.plant_type}</span>
                                                            </div>
                                                                    )}
                                                                    {item.age_category && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Age:</span>
                                                                            <span className="font-medium">{item.age_category}</span>
                                                        </div>
                                                                    )}
                                                                    {item.height_range && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Height:</span>
                                                                            <span className="font-medium">{item.height_range}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Growth Details */}
                                                            <div className="space-y-2">
                                                                <h5 className="font-medium text-gray-700 text-sm">Growth Details</h5>
                                                                <div className="space-y-1 text-sm">
                                                                    {item.stem_thickness && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Stem Thickness:</span>
                                                                            <span className="font-medium">{item.stem_thickness}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.bag_size && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Bag Size:</span>
                                                                            <span className="font-medium">{item.bag_size}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Grafted:</span>
                                                                        <span className="font-medium">{item.is_grafted ? 'Yes' : 'No'}</span>
                                                                    </div>
                                                                    {item.delivery_location && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Delivery:</span>
                                                                            <span className="font-medium">
                                                                                {typeof item.delivery_location === 'string' 
                                                                                    ? item.delivery_location 
                                                                                    : typeof item.delivery_location === 'object' 
                                                                                        ? `${item.delivery_location.city || ''}, ${item.delivery_location.district || ''}, ${item.delivery_location.pinCode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
                                                                                        : String(item.delivery_location)
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Delivery Timeline */}
                                                        {item.delivery_timeline && (
                                                            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                                            <div className="flex items-center space-x-2">
                                                                    <Clock className="w-4 h-4 text-yellow-600" />
                                                                    <span className="text-sm font-medium text-yellow-800">
                                                                        Delivery Timeline: {item.delivery_timeline}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Additional Notes */}
                                                        {item.notes && (
                                                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex items-start space-x-2">
                                                                    <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-700">Notes:</span>
                                                                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Pricing Section */}
                                                        <div className="border-t pt-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                                                <Label htmlFor={`product_price_${q.id}_${idx}`} className="text-sm font-medium text-gray-700">
                                                                    Your Price per unit (₹):
                                                                </Label>
                                                                <div className="flex items-center space-x-3">
                                                                <Input
                                                                    id={`product_price_${q.id}_${idx}`}
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                        className="w-24 h-10 text-sm"
                                                                    value={formStates[q.id]?.unit_prices?.[idx] || ''}
                                                                    onChange={(e) => handleProductPriceChange(q.id, idx, e.target.value)}
                                                                />
                                                                    <div className="text-sm text-gray-600">
                                                                        <span className="font-medium">
                                                                    Total: ₹{((parseFloat(formStates[q.id]?.unit_prices?.[idx]) || 0) * (item.quantity || 1)).toFixed(2)}
                                                                </span>
                                                                    </div>
                                                                </div>
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
                                        <h4 className="font-semibold mb-3 text-sm sm:text-base">Additional Information</h4>
                                        <div className="space-y-3">
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
                                                        ₹{calculateTotalProductCost(q.id, q.items || []).toFixed(2)}
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
                    .eq('is_user_request', false);
                
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
                    data.flatMap((q: any) => Array.isArray(q.items) ? q.items.map((item: any) => {
                        // Handle different data structures:
                        // - Individual shop products: item.product_id (actual product ID)
                        // - Catalog quotations: item.product_id is null, no lookup needed
                        return item.product_id;
                    }) : [])
                )).filter(id => id !== undefined && id !== null && id !== 'null'); // Filter out undefined, null, and 'null' values
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
        
        // Set up real-time subscription for quotation status changes
        if (merchantCode) {
            const quotationSubscription = supabase
                .channel(`merchant_quotations_${merchantCode}`)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'quotations',
                        filter: `merchant_code=eq.${merchantCode}`
                    }, 
                    (payload) => {
                        console.log('Quotation status changed:', payload);
                        // Refresh quotations data when there's a change
                        fetchMyQuotations();
                        
                        // Show notification for status changes
                        if (payload.eventType === 'UPDATE') {
                            const newStatus = payload.new.status;
                            const oldStatus = payload.old.status;
                            
                            if (newStatus === 'user_confirmed' && oldStatus !== 'user_confirmed') {
                                setToastMsg('👤 User confirmed your quotation!');
                                setShowToast(true);
                                setTimeout(() => setShowToast(false), 5000);
                            } else if (newStatus === 'order_placed' && oldStatus !== 'order_placed') {
                                setToastMsg('🛒 Order placed from your quotation!');
                                setShowToast(true);
                                setTimeout(() => setShowToast(false), 5000);
                            }
                        }
                    }
                )
                .subscribe();
                
            return () => {
                quotationSubscription.unsubscribe();
            };
        }
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
                    .eq('is_user_request', false);
                
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

    // Calculate product cost from unit prices and items
    const calculateProductCost = (quotation: any) => {
        if (!quotation.unit_prices || !quotation.items) return 0;
        
        let total = 0;
        const unitPrices = Array.isArray(quotation.unit_prices) ? quotation.unit_prices : [];
        
        quotation.items.forEach((item: any, index: number) => {
            const unitPrice = parseFloat(unitPrices[index]) || 0;
            const quantity = item.quantity || item.qty || 1;
            total += unitPrice * quantity;
        });
        
        return total;
    };

    // Get unit price for a specific item
    const getUnitPrice = (quotation: any, itemIndex: number) => {
        if (!quotation.unit_prices) return 0;
        const unitPrices = Array.isArray(quotation.unit_prices) ? quotation.unit_prices : [];
        return parseFloat(unitPrices[itemIndex]) || 0;
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="waiting_for_admin">Waiting for Admin</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="user_confirmed">User Confirmed</SelectItem>
                        <SelectItem value="order_placed">Order Placed</SelectItem>
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
                    {filteredQuotations.map((q) => {
                        const productCost = calculateProductCost(q);
                        const totalPrice = productCost;
                        
                        return (
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
                                            {q.status === 'pending' && (
                                                <Badge variant="secondary" className="text-xs">⏳ Pending</Badge>
                                            )}
                                            {q.status === 'waiting_for_admin' && (
                                                <Badge variant="secondary" className="text-xs">⏳ Waiting for Admin</Badge>
                                            )}
                                            {q.status === 'approved' && (
                                                <Badge className="bg-green-100 text-green-800 text-xs">✅ APPROVED</Badge>
                                            )}
                                            {q.status === 'user_confirmed' && (
                                                <Badge className="bg-blue-100 text-blue-800 text-xs">👤 User Confirmed</Badge>
                                            )}
                                            {q.status === 'order_placed' && (
                                                <Badge className="bg-purple-100 text-purple-800 text-xs">🛒 Order Placed</Badge>
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
                                            <h4 className="font-semibold mb-3 text-sm sm:text-base">Items & Pricing</h4>
                                            <div className="space-y-3">
                                                {Array.isArray(q.items) ? q.items.map((item: any, idx: number) => {
                                                    let productId = undefined;
                                                    let product = null;
                                                    
                                                    if (typeof item === 'string' || typeof item === 'number') {
                                                        productId = item;
                                                        product = productMap[productId];
                                                    } else if (typeof item === 'object' && item !== null) {
                                                        productId = item.product_id;
                                                        // Only try to look up product if we have a valid product ID
                                                        if (productId && productId !== 'null' && productId !== null) {
                                                            product = productMap[productId];
                                                        }
                                                    }
                                                    
                                                    // Determine if this is a catalog quotation (no product_id) or individual shop product
                                                    const isCatalogQuotation = !productId || productId === 'null' || productId === null;
                                                    const unitPrice = getUnitPrice(q, idx);
                                                    const quantity = item.quantity || item.qty || 1;
                                                    const itemTotal = unitPrice * quantity;
                                                    
                                                    return (
                                                        <div key={idx} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                                            {/* Product Header */}
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                {(product?.image_url || item.image || item.image_url) && (
                                                                    <img 
                                                                        src={product?.image_url || item.image || item.image_url} 
                                                                        alt={isCatalogQuotation ? (item.product_name || item.name || item.title || item.plant_name || item.variety || `Product ${idx + 1}`) : (product?.name || item.name || item.title || `Product ${productId || idx + 1}`)} 
                                                                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-semibold text-lg text-gray-800 mb-1">
                                                                        {isCatalogQuotation ? (
                                                                            item.product_name || 
                                                                            item.name || 
                                                                            item.title ||
                                                                            item.plant_name ||
                                                                            item.variety ||
                                                                            `Product ${idx + 1}`
                                                                        ) : (
                                                                            product?.name || 
                                                                            item.name || 
                                                                            item.title ||
                                                                            `Product ${productId || idx + 1}`
                                                                        )}
                                                                    </h4>
                                                                    <p className="text-sm text-gray-600">
                                                                        Quantity: <span className="font-medium text-green-600">{quantity}</span>
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Comprehensive Plant Details */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                {/* Plant Information */}
                                                                <div className="space-y-2">
                                                                    <h5 className="font-medium text-gray-700 text-sm">Plant Information</h5>
                                                                    <div className="space-y-1 text-sm">
                                                                        {item.variety && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Variety:</span>
                                                                                <span className="font-medium">{item.variety}</span>
                                                                        </div>
                                                                    )}
                                                                        {item.plant_type && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Type:</span>
                                                                                <span className="font-medium">{item.plant_type}</span>
                                                                </div>
                                                                        )}
                                                                        {item.age_category && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Age:</span>
                                                                                <span className="font-medium">{item.age_category}</span>
                                                            </div>
                                                                        )}
                                                                        {item.height_range && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Height:</span>
                                                                                <span className="font-medium">{item.height_range}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Growth Details */}
                                                                <div className="space-y-2">
                                                                    <h5 className="font-medium text-gray-700 text-sm">Growth Details</h5>
                                                                    <div className="space-y-1 text-sm">
                                                                        {item.stem_thickness && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Stem Thickness:</span>
                                                                                <span className="font-medium">{item.stem_thickness}</span>
                                                                            </div>
                                                                        )}
                                                                        {item.bag_size && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Bag Size:</span>
                                                                                <span className="font-medium">{item.bag_size}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Grafted:</span>
                                                                            <span className="font-medium">{item.is_grafted ? 'Yes' : 'No'}</span>
                                                                        </div>
                                                                        {item.delivery_location && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Delivery:</span>
                                                                                <span className="font-medium">
                                                                                    {typeof item.delivery_location === 'string' 
                                                                                        ? item.delivery_location 
                                                                                        : typeof item.delivery_location === 'object' 
                                                                                            ? `${item.delivery_location.city || ''}, ${item.delivery_location.district || ''}, ${item.delivery_location.pinCode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
                                                                                            : String(item.delivery_location)
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Delivery Timeline */}
                                                            {item.delivery_timeline && (
                                                                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                                                    <div className="flex items-center space-x-2">
                                                                        <Clock className="w-4 h-4 text-yellow-600" />
                                                                        <span className="text-sm font-medium text-yellow-800">
                                                                            Delivery Timeline: {item.delivery_timeline}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Additional Notes */}
                                                            {item.notes && (
                                                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                                                    <div className="flex items-start space-x-2">
                                                                        <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                                                                        <div>
                                                                            <span className="text-sm font-medium text-gray-700">Notes:</span>
                                                                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Pricing Information */}
                                                            <div className="border-t pt-4">
                                                                <div className="flex justify-between items-center text-sm mb-2">
                                                                <span className="text-gray-600">Unit Price:</span>
                                                                <span className="font-medium">₹{unitPrice.toFixed(2)}</span>
                                                            </div>
                                                                <div className="flex justify-between items-center text-base">
                                                                    <span className="text-gray-700 font-medium">Item Total:</span>
                                                                    <span className="font-bold text-green-600">₹{itemTotal.toFixed(2)}</span>
                                                                </div>
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
                                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 text-sm">Product Cost:</span>
                                                    <span className="font-medium text-sm">₹{productCost.toFixed(2)}</span>
                                                </div>
                                                <div className="border-t pt-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-sm sm:text-base">Total Price:</span>
                                                        <span className="font-bold text-base sm:text-lg text-green-600">₹{totalPrice.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-500">
                                                    Delivery: {q.estimated_delivery_days || '7'} days
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-500">
                                                    Submitted: {new Date(q.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
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
                // Use the same simple approach as admin dashboard
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                if (ordersError) {
                    console.error('Error fetching orders:', ordersError);
                    setOrders([]);
                } else {
                    setOrders(ordersData || []);
                }
            } catch (error) {
                console.error('Error fetching recent orders:', error);
                setOrders([]);
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
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">Order #{order.id?.slice(0, 8)}...</p>
                        <p className="text-sm text-gray-500">₹{order.total_amount || 0}</p>
                        <p className="text-xs text-gray-400">
                            {order.quotation_code ? `Quote: ${order.quotation_code}` : 'Direct Order'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {/* Show order items count */}
                        <p className="text-xs text-gray-400">
                            {(() => {
                                // For recent orders, we'll show a simple count since we don't have order_items joined
                                const itemCount = order.cart_items && Array.isArray(order.cart_items) 
                                    ? order.cart_items.length 
                                    : 1; // Default to 1 if we can't determine
                                return `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
                            })()}
                        </p>
                    </div>
                    <div className="text-right">
                        <Badge variant={
                            order.order_status === 'delivered' ? 'default' :
                            order.order_status === 'shipped' ? 'secondary' :
                            order.order_status === 'confirmed' ? 'secondary' :
                            'outline'
                        }>
                            {order.order_status || order.status || 'pending'}
                        </Badge>
                    </div>
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

// Dashboard Overview Component
const DashboardOverview: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockProducts: 0,
        totalQuotations: 0,
        pendingQuotations: 0,
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        averageRating: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            if (!merchantCode) return;
            
            try {
                // Fetch products count
                const { data: products } = await supabase
                    .from('products')
                    .select('available_quantity')
                    .eq('merchant_code', merchantCode);
                
                const totalProducts = products?.length || 0;
                const lowStockProducts = products?.filter(p => (p.available_quantity || 0) < 10).length || 0;

                // Fetch quotations count
                const { data: quotations } = await supabase
                    .from('quotations')
                    .select('status')
                    .eq('merchant_code', merchantCode)
                    .eq('is_user_request', false);
                
                const totalQuotations = quotations?.length || 0;
                const pendingQuotations = quotations?.filter(q => q.status === 'pending').length || 0;

                // Fetch orders count and revenue (handle case where orders table doesn't exist)
                let totalOrders = 0;
                let completedOrders = 0;
                let totalRevenue = 0;
                try {
                    const { data: orders } = await supabase
                        .from('orders')
                        .select('total_amount, status')
                        .eq('merchant_code', merchantCode);
                    
                    totalOrders = orders?.length || 0;
                    completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
                    totalRevenue = orders?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;
                } catch (error) {
                    console.log('Orders table not available yet, setting orders data to 0');
                    totalOrders = 0;
                    completedOrders = 0;
                    totalRevenue = 0;
                }

                // Fetch average rating (handle case where reviews table doesn't exist)
                let averageRating = 0;
                try {
                    const { data: reviews } = await supabase
                        .from('reviews')
                        .select('rating')
                        .eq('merchant_code', merchantCode);
                    
                    averageRating = reviews?.length > 0 
                        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length 
                        : 0;
                } catch (error) {
                    console.log('Reviews table not available yet, setting average rating to 0');
                    averageRating = 0;
                }

                setStats({
                    totalProducts,
                    lowStockProducts,
                    totalQuotations,
                    pendingQuotations,
                    totalOrders,
                    completedOrders,
                    totalRevenue,
                    averageRating
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, [merchantCode]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Products */}
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Products</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    {stats.lowStockProducts > 0 && (
                        <div className="mt-2 flex items-center text-orange-600 text-sm">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {stats.lowStockProducts} low stock
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quotations */}
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Quotations</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalQuotations}</p>
                        </div>
                        <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    {stats.pendingQuotations > 0 && (
                        <div className="mt-2 flex items-center text-blue-600 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            {stats.pendingQuotations} pending
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Orders */}
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                        </div>
                        <ShoppingCart className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2 flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {stats.completedOrders} completed
                    </div>
                </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2 flex items-center text-gray-600 text-sm">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        {stats.averageRating.toFixed(1)} avg rating
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Order Management Component
const OrderManagement: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
    const [orderDetails, setOrderDetails] = useState<{[key: string]: any}>({});

    useEffect(() => {
        const fetchOrders = async () => {
            
            if (!merchantCode || !merchantCode.trim()) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                
                // Test database connection first
                const { data: testData, error: testError } = await supabase
                    .from('orders')
                    .select('count', { count: 'exact', head: true });
                
                
                // Use the same simple approach as admin dashboard - fetch orders and order_items separately
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .order('created_at', { ascending: false });
                
                // Skip order_items query due to 403 permission error
                // We'll use cart_items from orders table instead
                let orderItemsData = [];
                let orderItemsError = null;
                
                
                
                if (!ordersError) {
                    setOrders(ordersData || []);
                    setOrderItems(orderItemsData || []);
                    
                    
                    // Fetch additional details for each order
                    const detailsPromises = (ordersData || []).map(async (order) => {
                        try {
                            // Fetch user details if available - use user_profiles table instead of admin call
                            let userInfo = null;
                            if (order.user_id) {
                                try {
                                    const { data: profileData } = await supabase
                                        .from('user_profiles')
                                        .select('first_name, last_name, email')
                                        .eq('id', order.user_id)
                                        .single();
                                    
                                    if (profileData) {
                                        userInfo = {
                                            email: profileData.email || 'No email',
                                            name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown User'
                                        };
                                    }
                                } catch (profileError) {
                                    console.log('Could not fetch user profile:', profileError);
                                    userInfo = {
                                        email: 'No email available',
                                        name: 'Unknown User'
                                    };
                                }
                            }
                            
                            // Since order_items are not accessible due to 403 error, always use cart_items
                            let cartItems = [];
                            if (order.cart_items) {
                                try {
                                    cartItems = typeof order.cart_items === 'string' 
                                        ? JSON.parse(order.cart_items) 
                                        : order.cart_items;
                                } catch (e) {
                                    console.log('Error parsing cart_items:', e);
                                    cartItems = [];
                                }
                            }
                            
                            return {
                                orderId: order.id,
                                userInfo,
                                items: cartItems
                            };
                        } catch (err) {
                            console.error('Error fetching order details:', err);
                            return {
                                orderId: order.id,
                                userInfo: null,
                                items: order.cart_items || []
                            };
                        }
                    });
                    
                    const details = await Promise.all(detailsPromises);
                    const detailsMap = details.reduce((acc, detail) => {
                        acc[detail.orderId] = detail;
                        return acc;
                    }, {});
                    setOrderDetails(detailsMap);
                    
                } else {
                    console.error('OrderManagement: Error fetching orders:', ordersError);
                    setOrders([]);
                    setOrderItems([]);
                }
            } catch (error) {
                console.error('OrderManagement: Unexpected error fetching orders:', error);
                setOrders([]);
                setOrderItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [merchantCode]);

    const handleViewOrderDetails = (order: any) => {
        // Since order_items are not accessible due to 403 error, always use cart_items
        let cartItems = [];
        if (order.cart_items) {
            try {
                cartItems = typeof order.cart_items === 'string' 
                    ? JSON.parse(order.cart_items) 
                    : order.cart_items;
            } catch (e) {
                console.log('Error parsing cart_items in view details:', e);
                cartItems = [];
            }
        }
        
        const items = cartItems;
        
        // Create a detailed view of the order items
        const orderDetails = {
            orderCode: order.order_code || 'N/A',
            totalAmount: order.total_amount || 0,
            status: order.status || 'pending',
            createdAt: new Date(order.created_at).toLocaleString(),
            items: items.map((item: any) => ({
                name: item.product?.name || item.name || 'Unknown Product',
                quantity: item.quantity || 1,
                price: item.total_price || item.unit_price || item.price || 0,
                image: item.product?.image_url || item.image
            }))
        };
        
        // Show order details in an alert for now (you can replace this with a modal later)
        alert(`Order Details:\n\nOrder Code: ${orderDetails.orderCode}\nTotal Amount: ₹${orderDetails.totalAmount}\nStatus: ${orderDetails.status}\nCreated: ${orderDetails.createdAt}\n\nItems:\n${orderDetails.items.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${item.price}`).join('\n')}`);
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdatingOrder(orderId);
        
        try {
            // Use the update_order_delivery_status function for better control
            const { data, error } = await supabase.rpc('update_order_delivery_status', {
                p_order_id: orderId,
                p_merchant_code: merchantCode,
                p_delivery_status: newStatus
            });
            
            if (!error && data?.success) {
                setOrders(prev => prev.map(order => 
                    order.id === orderId 
                        ? { ...order, order_status: newStatus, status: newStatus }
                        : order
                ));
                toast({
                    title: "Order Updated",
                    description: `Order status updated to ${newStatus}`,
                    variant: "default"
                });
            } else {
                throw new Error(data?.message || 'Failed to update order');
            }
        } catch (error) {
            console.error('Error updating order:', error);
            toast({
                title: "Error",
                description: "Failed to update order status",
                variant: "destructive"
            });
        } finally {
            setUpdatingOrder(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            'confirmed': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
            'shipped': { color: 'bg-purple-100 text-purple-800', icon: Truck },
            'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            'cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle },
            'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        
        return (
            <Badge className={config.color}>
                <Icon className="h-3 w-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const filteredOrders = statusFilter === 'all' 
        ? orders 
        : orders.filter(order => (order.order_status || order.status) === statusFilter);


    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Order Management Controls */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Label htmlFor="orderStatusFilter" className="text-sm">Filter by Status:</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-48 h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Orders</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex space-x-2">
                <Button
                    onClick={() => {
                        setLoading(true);
                        // Re-fetch orders
                        const fetchOrders = async () => {
                            if (!merchantCode) return;
                            
                            try {
                                    // Use the same simple approach as admin dashboard
                                    const { data: ordersData, error: ordersError } = await supabase
                                    .from('orders')
                                    .select('*')
                                    .eq('merchant_code', merchantCode)
                                    .order('created_at', { ascending: false });
                                
                                                                    // Skip order_items query due to 403 permission error
                                // We'll use cart_items from orders table instead
                                let orderItemsData = [];
                                let orderItemsError = null;
                                
                                    
                                    if (!ordersError) {
                                        setOrders(ordersData || []);
                                        setOrderItems(orderItemsData || []);
                                    // Re-fetch order details
                                        const detailsPromises = (ordersData || []).map(async (order) => {
                                        try {
                                            let userInfo = null;
                                            if (order.user_id) {
                                                try {
                                                    const { data: profileData } = await supabase
                                                        .from('user_profiles')
                                                        .select('first_name, last_name, email')
                                                        .eq('id', order.user_id)
                                                        .single();
                                                    
                                                    if (profileData) {
                                                        userInfo = {
                                                            email: profileData.email || 'No email',
                                                            name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown User'
                                                        };
                                                    }
                                                } catch (profileError) {
                                                    console.log('Could not fetch user profile:', profileError);
                                                    userInfo = {
                                                        email: 'No email available',
                                                        name: 'Unknown User'
                                                    };
                                                }
                                            }
                                                
                                            // Since order_items are not accessible due to 403 error, always use cart_items
                                            let cartItems = [];
                                            if (order.cart_items) {
                                                try {
                                                    cartItems = typeof order.cart_items === 'string' 
                                                        ? JSON.parse(order.cart_items) 
                                                        : order.cart_items;
                                                } catch (e) {
                                                    console.log('Error parsing cart_items in refresh:', e);
                                                    cartItems = [];
                                                }
                                            }
                                            
                                            return {
                                                orderId: order.id,
                                                userInfo,
                                                items: cartItems
                                            };
                                        } catch (err) {
                                            return {
                                                orderId: order.id,
                                                userInfo: null,
                                                    items: order.cart_items || []
                                            };
                                        }
                                    });
                                    
                                    const details = await Promise.all(detailsPromises);
                                    const detailsMap = details.reduce((acc, detail) => {
                                        acc[detail.orderId] = detail;
                                        return acc;
                                    }, {});
                                    setOrderDetails(detailsMap);
                                }
                            } catch (error) {
                                console.error('Error refreshing orders:', error);
                            } finally {
                                setLoading(false);
                            }
                        };
                        fetchOrders();
                    }}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh Orders
                </Button>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No orders found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.map(order => {
                                const orderItemsForOrder = orderItems.filter(item => item.order_id === order.id);
                                
                                // Handle cart_items - parse if it's a JSON string
                                let cartItems = [];
                                if (order.cart_items) {
                                    try {
                                        cartItems = typeof order.cart_items === 'string' 
                                            ? JSON.parse(order.cart_items) 
                                            : order.cart_items;
                                    } catch (e) {
                                        console.log('Error parsing cart_items in table:', e);
                                        cartItems = [];
                                    }
                                }
                                
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{order.order_code || order.id?.slice(0, 8) || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {orderDetails[order.id]?.userInfo?.name || 'Unknown User'}
                                                <div className="text-xs text-gray-500">
                                                    {orderDetails[order.id]?.userInfo?.email || order.user_id || 'No email'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {(() => {
                                                    // Since order_items are not accessible due to 403 error, always use cart_items
                                                    const itemCount = cartItems && Array.isArray(cartItems) 
                                                        ? cartItems.length 
                                                        : 0;
                                                    
                                                    return (
                                                        <div className="space-y-3">
                                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="text-lg font-semibold text-gray-700">
                                                                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Click below to view details
                                                            </div>
                                                        </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                                onClick={() => handleViewOrderDetails(order)}
                                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 w-full"
                                                >
                                                                View Items
                                                </Button>
                                        </div>
                                                    );
                                                })()}
                                    </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-lg font-bold text-gray-900">₹{order.total_amount || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={
                                                order.status === 'pending' ? 'secondary' :
                                                order.status === 'processing' ? 'default' :
                                                order.status === 'shipped' ? 'outline' :
                                                order.status === 'delivered' ? 'default' :
                                                order.status === 'cancelled' ? 'destructive' :
                                                'outline'
                                            }>
                                                {order.status || 'pending'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(order.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Analytics Component
const Analytics: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [analytics, setAnalytics] = useState({
        monthlySales: [],
        topProducts: [],
        salesTrend: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!merchantCode) return;
            
            try {
                // Fetch monthly sales data
                const { data: orders } = await supabase
                    .from('orders')
                    .select('total_amount, created_at, status')
                    .eq('merchant_code', merchantCode)
                    .eq('status', 'delivered');
                
                // Process monthly sales
                const monthlyData = orders?.reduce((acc: any, order) => {
                    const month = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    acc[month] = (acc[month] || 0) + parseFloat(order.total_amount || 0);
                    return acc;
                }, {}) || {};

                const monthlySales = Object.entries(monthlyData).map(([month, amount]) => ({
                    month,
                    amount: amount as number
                }));

                setAnalytics({
                    monthlySales,
                    topProducts: [],
                    salesTrend: []
                });
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [merchantCode]);

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Monthly Sales Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5" />
                        <span>Monthly Sales</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {analytics.monthlySales.length > 0 ? (
                        <div className="space-y-4">
                            {analytics.monthlySales.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">{item.month}</span>
                                    <span className="text-green-600 font-semibold">₹{item.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No sales data available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <DollarSign className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="text-sm text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold">
                                    ₹{analytics.monthlySales.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <ShoppingCart className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Orders Completed</p>
                                <p className="text-2xl font-bold">{analytics.monthlySales.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-8 h-8 text-purple-600" />
                            <div>
                                <p className="text-sm text-gray-600">Growth Rate</p>
                                <p className="text-2xl font-bold">+12.5%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// Reviews Component
const Reviews: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!merchantCode) return;
            
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('merchant_code', merchantCode)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    setReviews(data);
                    const avg = data.length > 0 
                        ? data.reduce((sum, review) => sum + (review.rating || 0), 0) / data.length 
                        : 0;
                    setAverageRating(avg);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [merchantCode]);

    const renderStars = (rating: number) => {
        return [...Array(5)].map((_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
        ));
    };

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading reviews...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Average Rating */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span>Overall Rating</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center">
                        <div className="flex justify-center mb-2">
                            {renderStars(averageRating)}
                        </div>
                        <p className="text-2xl font-bold">{averageRating.toFixed(1)}/5.0</p>
                        <p className="text-gray-600">{reviews.length} reviews</p>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Reviews</h3>
                {reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No reviews yet</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <Card key={review.id}>
                            <CardContent className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="font-medium">{review.customer_name || 'Anonymous'}</span>
                                            <div className="flex">
                                                {renderStars(review.rating || 0)}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 mb-2">{review.comment}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

// Reports Component
const Reports: React.FC<{ merchantCode: string | null }> = ({ merchantCode }) => {
    const [generatingReport, setGeneratingReport] = useState(false);

    const handleExportReport = async (format: 'excel' | 'pdf') => {
        setGeneratingReport(true);
        
        try {
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast({
                title: "Report Generated",
                description: `${format.toUpperCase()} report is ready for download`,
                variant: "default"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate report",
                variant: "destructive"
            });
        } finally {
            setGeneratingReport(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Report Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5" />
                            <span>Sales Report</span>
                        </CardTitle>
                        <CardDescription>Monthly sales performance and trends</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => handleExportReport('excel')}
                                disabled={generatingReport}
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export Excel'}
                            </Button>
                            <Button
                                onClick={() => handleExportReport('pdf')}
                                disabled={generatingReport}
                                variant="outline"
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export PDF'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Package className="w-5 h-5" />
                            <span>Inventory Report</span>
                        </CardTitle>
                        <CardDescription>Product stock levels and alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => handleExportReport('excel')}
                                disabled={generatingReport}
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export Excel'}
                            </Button>
                            <Button
                                onClick={() => handleExportReport('pdf')}
                                disabled={generatingReport}
                                variant="outline"
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export PDF'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <ShoppingCart className="w-5 h-5" />
                            <span>Orders Report</span>
                        </CardTitle>
                        <CardDescription>Order history and fulfillment status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => handleExportReport('excel')}
                                disabled={generatingReport}
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export Excel'}
                            </Button>
                            <Button
                                onClick={() => handleExportReport('pdf')}
                                disabled={generatingReport}
                                variant="outline"
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export PDF'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Star className="w-5 h-5" />
                            <span>Reviews Report</span>
                        </CardTitle>
                        <CardDescription>Customer feedback and ratings analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => handleExportReport('excel')}
                                disabled={generatingReport}
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export Excel'}
                            </Button>
                            <Button
                                onClick={() => handleExportReport('pdf')}
                                disabled={generatingReport}
                                variant="outline"
                                className="flex-1"
                            >
                                {generatingReport ? 'Generating...' : 'Export PDF'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">4</p>
                            <p className="text-sm text-gray-600">Report Types</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">2</p>
                            <p className="text-sm text-gray-600">Export Formats</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">30</p>
                            <p className="text-sm text-gray-600">Days History</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">Auto</p>
                            <p className="text-sm text-gray-600">Generation</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MerchantDashboard; 