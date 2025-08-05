import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const AdminDashboard: React.FC = () => {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [merchants, setMerchants] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [merchantsLoading, setMerchantsLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [merchantQuotations, setMerchantQuotations] = useState<any[]>([]);
    const [approvedPrice, setApprovedPrice] = useState<{ [id: string]: number }>({});
    const [editingApprovedPriceId, setEditingApprovedPriceId] = useState<string | null>(null);
    const [editedApprovedPrice, setEditedApprovedPrice] = useState<string>('');

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            const { data: quotationsData, error: quotationsError } = await supabase
                .from('quotations')
                .select('*')
                .order('created_at', { ascending: false });
            const { data: merchantsData, error: merchantsError } = await supabase
                .from('merchants')
                .select('*');
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            const { data: orderItemsData, error: orderItemsError } = await supabase
                .from('order_items')
                .select('*');
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*');
            
            if (!quotationsError && !merchantsError && !ordersError && !orderItemsError && !productsError) {
                setQuotations(quotationsData || []);
                setMerchants(merchantsData || []);
                setOrders(ordersData || []);
                setOrderItems(orderItemsData || []);
                setProducts(productsData || []);
                const merchantCodes = merchantsData?.map((m: any) => m.merchant_code).filter(Boolean) || [];
                setMerchantQuotations((quotationsData || []).filter((q: any) => 
                    merchantCodes.includes(q.merchant_code) && q.status === 'waiting_for_admin'
                ));
            }
            setLoading(false);
        };
        fetchAll();
    }, [actionLoading]);

    useEffect(() => {
        const fetchMerchants = async () => {
            setMerchantsLoading(true);
            const { data, error } = await supabase
                .from('merchants')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setMerchants(data || []);
            setMerchantsLoading(false);
        };
        fetchMerchants();
    }, [actionLoading]);

    const handleMerchantStatus = async (id: string, status: 'approved' | 'rejected') => {
        setActionLoading(id + status);
        await supabase.from('merchants').update({ status }).eq('id', id);
        setActionLoading(null);

        if (status === 'approved') {
            toast({
                title: "Merchant Approved!",
                description: "Merchant can now access their dashboard.",
                variant: "default"
            });
        } else if (status === 'rejected') {
            toast({
                title: "Merchant Rejected",
                description: "Merchant was rejected.",
                variant: "destructive"
            });
        }
    };

    const handleApproveMerchantQuotation = async (q: any) => {
        setActionLoading(q.id + 'approve');
        
        const { data: quotations, error: findError } = await supabase
            .from('quotations')
            .select('*')
            .eq('user_id', q.user_id)
            .eq('quotation_code', q.quotation_code);
            
        const originalQuotation = quotations?.find(q => !q.merchant_code);
            
        if (findError || !originalQuotation) {
            setActionLoading(null);
            toast({
                title: "Error",
                description: "Could not find original user quotation",
                variant: "destructive"
            });
            return;
        }
        
        const { error: updateMerchantError } = await supabase
            .from('quotations')
            .update({ 
                status: 'approved', 
                approved_price: approvedPrice[q.id],
                updated_at: new Date().toISOString()
            })
            .eq('id', q.id);
            
        setActionLoading(null);
        
        if (!updateMerchantError) {
            setApprovedPrice(prev => {
                const newState = { ...prev };
                delete newState[q.id];
                return newState;
            });
            const { data: quotationsData } = await supabase
                .from('quotations')
                .select('*')
                .order('created_at', { ascending: false });
            setQuotations(quotationsData || []);
            const merchantCodes = merchants.map((m: any) => m.merchant_code).filter(Boolean);
            setMerchantQuotations(quotationsData?.filter((q: any) => 
                merchantCodes.includes(q.merchant_code) && q.status === 'waiting_for_admin'
            ) || []);
            toast({
                title: "Quotation Approved!",
                description: `Quotation ${originalQuotation.quotation_code} has been approved and sent to user.`,
                variant: "default"
            });
            const { data: merchantQuotationsForCode, error: fetchError } = await supabase
                .from('quotations')
                .select('*')
                .eq('quotation_code', q.quotation_code);
            if (fetchError) {
                console.error('Error fetching merchant quotations for verification:', fetchError);
            } else {
                console.log('All quotations for this quotation_code:', merchantQuotationsForCode);
            }
        } else {
            toast({
                title: "Error",
                description: "Failed to update merchant quotation: " + updateMerchantError.message,
                variant: "destructive"
            });
        }
    };

    const handleRejectMerchantQuotation = async (q: any) => {
        setActionLoading(q.id + 'reject');
        
        const { data: quotations, error: findError } = await supabase
            .from('quotations')
            .select('*')
            .eq('user_id', q.user_id)
            .eq('quotation_code', q.quotation_code);
            
        const originalQuotation = quotations?.find(q => !q.merchant_code);
            
        if (findError || !originalQuotation) {
            setActionLoading(null);
            toast({
                title: "Error",
                description: "Could not find original user quotation",
                variant: "destructive"
            });
            return;
        }
        
        const { error: updateMerchantError } = await supabase
            .from('quotations')
            .update({ 
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', q.id);
            
        setActionLoading(null);
        
        if (!updateMerchantError) {
            const { data: quotationsData } = await supabase
                .from('quotations')
                .select('*')
                .order('created_at', { ascending: false });
            setQuotations(quotationsData || []);
            const merchantCodes = merchants.map((m: any) => m.merchant_code).filter(Boolean);
            setMerchantQuotations(quotationsData?.filter((q: any) => 
                merchantCodes.includes(q.merchant_code) && q.status === 'waiting_for_admin'
            ) || []);
            toast({
                title: "Quotation Rejected",
                description: `Quotation ${originalQuotation.quotation_code} has been rejected.`,
                variant: "destructive"
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to reject quotation: " + updateMerchantError.message,
                variant: "destructive"
            });
        }
    };

    const handleEditApprovedPrice = (q: any) => {
        setEditingApprovedPriceId(q.id);
        setEditedApprovedPrice(q.approved_price ? String(q.approved_price) : '');
    };

    const handleSaveApprovedPrice = async (q: any) => {
        setActionLoading(q.id + 'saveapproved');
        await supabase
            .from('quotations')
            .update({ approved_price: Number(editedApprovedPrice) })
            .eq('id', q.id);
        setActionLoading(null);
        setEditingApprovedPriceId(null);
        setEditedApprovedPrice('');
        const { data: quotationsData } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
        setQuotations(quotationsData || []);
    };

    const filteredMerchants = merchants.filter((m: any) => {
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            m.full_name.toLowerCase().includes(q) ||
            m.nursery_name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage merchants, quotations, and system operations</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Merchants</p>
                                <p className="text-2xl font-bold text-gray-900">{merchants.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Approved Merchants</p>
                                <p className="text-2xl font-bold text-gray-900">{merchants.filter(m => m.status === 'approved').length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                                <p className="text-2xl font-bold text-gray-900">{merchantQuotations.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                                <p className="text-2xl font-bold text-gray-900">{quotations.filter(q => !q.merchant_code).length}</p>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Merchants Management Section */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Merchants Management</h2>
                        <p className="text-sm text-gray-600 mt-1">Approve or reject merchant applications</p>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)} 
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <input
                    type="text"
                    placeholder="Search by name, nursery, or email"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            {merchantsLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading merchants...</p>
                            </div>
            ) : filteredMerchants.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No merchants found.</p>
                            </div>
            ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                            <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                            {filteredMerchants.map((m: any) => (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{m.full_name}</div>
                                                        <div className="text-sm text-gray-500">{m.nursery_name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{m.email}</div>
                                                    <div className="text-sm text-gray-500">{m.phone_number}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        m.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        m.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {m.status === 'pending' && (
                                                        <div className="flex space-x-2">
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handleMerchantStatus(m.id, 'approved')} 
                                                                disabled={actionLoading === m.id + 'approved'}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                    {actionLoading === m.id + 'approved' ? 'Approving...' : 'Approve'}
                                                </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="destructive" 
                                                                onClick={() => handleMerchantStatus(m.id, 'rejected')} 
                                                                disabled={actionLoading === m.id + 'rejected'}
                                                            >
                                                    {actionLoading === m.id + 'rejected' ? 'Rejecting...' : 'Reject'}
                                                </Button>
                                                        </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
                    </div>
                </div>

            {/* Merchant Quotations Section */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">📋 Merchant Quotations (Pending Review)</h2>
                        <p className="text-sm text-gray-600 mt-1">Review and approve merchant quotations</p>
                    </div>
                    <div className="p-6">
            {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading merchant quotations...</p>
                            </div>
            ) : merchantQuotations.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No merchant quotations waiting for review.</p>
                </div>
            ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costs</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                            {merchantQuotations.map(q => (
                                            <tr key={q.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{q.merchant_code}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{q.quotation_code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs">
                                                        {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                            // Parse product_prices if it's a string, otherwise use as is
                                                            const productPrices = typeof q.product_prices === 'string' 
                                                                ? JSON.parse(q.product_prices || '{}') 
                                                                : (q.product_prices || {});
                                                            const pricePerUnit = productPrices[idx] || 0;
                                                            const totalForItem = pricePerUnit * (item.quantity || 1);
                                                            
                                                            // Find the product from products table
                                                            const product = products.find(p => p.id === item.product_id);
                                                            
                                                            return (
                                                                <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border">
                                                                    <div className="flex items-center space-x-2 mb-1">
                                                                        {product?.image_url ? (
                                                                            <img 
                                                                                src={product.image_url} 
                                                                                alt={product.name || item.product_name || ''} 
                                                                                className="w-6 h-6 object-cover rounded" 
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : item.image_url ? (
                                                                            <img 
                                                                                src={item.image_url} 
                                                                                alt={item.product_name || ''} 
                                                                                className="w-6 h-6 object-cover rounded" 
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <span className="font-medium text-xs">
                                                                            {product?.name || item.product_name || item.product_id}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 ml-2 space-y-1">
                                                                        <div>Quantity: {item.quantity}</div>
                                                                        <div className="text-green-600 font-medium">
                                                                            Price per unit: ₹{pricePerUnit || 'Not set'}
                                                                        </div>
                                                                        <div className="text-blue-600 font-medium">
                                                                            Total: ₹{totalForItem.toFixed(2)}
                                                                        </div>
                                                                    </div>
                                            </div>
                                                            );
                                                        }) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        <div className="mb-2">
                                                            <div className="font-medium text-green-600">Product Costs:</div>
                                                            {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                                const productPrices = typeof q.product_prices === 'string' 
                                                                    ? JSON.parse(q.product_prices || '{}') 
                                                                    : (q.product_prices || {});
                                                                const pricePerUnit = productPrices[idx] || 0;
                                                                const totalForItem = pricePerUnit * (item.quantity || 1);
                                                                
                                                                // Find the product from products table
                                                                const product = products.find(p => p.id === item.product_id);
                                                                
                                                                return (
                                                                    <div key={idx} className="text-xs ml-2 mb-1 p-1 bg-gray-50 rounded">
                                                                        <div className="flex items-center space-x-2 mb-1">
                                                                            {product?.image_url ? (
                                                                                <img 
                                                                                    src={product.image_url} 
                                                                                    alt={product.name || item.product_name || ''} 
                                                                                    className="w-4 h-4 object-cover rounded" 
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.style.display = 'none';
                                                                                    }}
                                                                                />
                                                                            ) : item.image_url ? (
                                                                                <img 
                                                                                    src={item.image_url} 
                                                                                    alt={item.product_name || ''} 
                                                                                    className="w-4 h-4 object-cover rounded" 
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.style.display = 'none';
                                                                                    }}
                                                                                />
                                                                            ) : null}
                                                                            <span className="font-medium">
                                                                                {product?.name || item.product_name || item.product_id}
                                                                            </span>
                                                                        </div>
                                                                        <div className="ml-6 text-gray-600">
                                                                            ₹{pricePerUnit} × {item.quantity} = ₹{totalForItem.toFixed(2)}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }) : null}
                                                        </div>
                                                        <div className="border-t pt-1">
                                                        <div>Transport: ₹{q.transport_cost ?? '-'}</div>
                                                        <div>Custom: ₹{q.custom_work_cost ?? '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-lg font-bold text-gray-900">₹{q.total_quote_price ?? '-'}</div>
                                                    <div className="text-sm text-gray-500">{q.estimated_delivery_days ?? '-'} days</div>
                                    </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Approved Price (₹):
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="Enter price"
                                                        value={approvedPrice[q.id] || ''}
                                                        onChange={e => setApprovedPrice(prev => ({ ...prev, [q.id]: Number(e.target.value) }))}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                        <div className="flex space-x-2">
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleApproveMerchantQuotation(q)} 
                                                        disabled={actionLoading === q.id + 'approve' || !approvedPrice[q.id]}
                                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                                                    >
                                                        {actionLoading === q.id + 'approve' ? 'Approving...' : 'Approve'}
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="destructive" 
                                                        onClick={() => handleRejectMerchantQuotation(q)} 
                                                        disabled={actionLoading === q.id + 'reject'}
                                                    >
                                                        {actionLoading === q.id + 'reject' ? 'Rejecting...' : 'Reject'}
                                                    </Button>
                                                </div>
                                                    </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
                    </div>
                </div>

            {/* User Quotations Section */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">👥 User Quotations (All)</h2>
                        <p className="text-sm text-gray-600 mt-1">View all user quotation requests</p>
                    </div>
                    <div className="p-6">
            {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading...</p>
                            </div>
                        ) : quotations.filter(q => !q.merchant_code).length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No user quotations found.</p>
                </div>
            ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costs</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {quotations
                                            .filter(q => !q.merchant_code)
                                            .filter((q, index, self) => 
                                                index === self.findIndex(t => t.quotation_code === q.quotation_code)
                                            )
                                            .map(q => (
                                            <tr key={q.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{q.quotation_code || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-mono text-gray-900">{q.user_id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs">
                                                        {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                            // Find the product from products table
                                                            const product = products.find(p => p.id === item.product_id);
                                                            
                                                            return (
                                                                <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border">
                                                                    <div className="flex items-center space-x-2 mb-1">
                                                                        {product?.image_url ? (
                                                                            <img 
                                                                                src={product.image_url} 
                                                                                alt={product.name || item.product_name || ''} 
                                                                                className="w-6 h-6 object-cover rounded" 
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : item.image_url ? (
                                                                            <img 
                                                                                src={item.image_url} 
                                                                                alt={item.product_name || ''} 
                                                                                className="w-6 h-6 object-cover rounded" 
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <div className="font-medium text-xs">
                                                                            {product?.name || item.product_name || `Item ${idx + 1}`}
                                                                        </div>
                                                                    </div>
                                                                <div className="text-xs text-gray-600 ml-2">
                                                    <div>Product ID: {item.product_id || item.id || 'N/A'}</div>
                                                    <div>Quantity: {item.quantity || item.qty || 1}</div>
                                                </div>
                                            </div>
                                                            );
                                                        }) : (
                                                            <div className="text-xs text-gray-600">
                                                {typeof q.items === 'string' ? q.items : JSON.stringify(q.items)}
                                            </div>
                                        )}
                                                    </div>
                                    </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        // Find the approved merchant quotation for this quotation code
                                                        const approvedMerchantQuotation = quotations
                                                            .filter(quotation => 
                                                                quotation.quotation_code === q.quotation_code && 
                                                                quotation.merchant_code && 
                                                                quotation.status === 'approved'
                                                            )
                                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                                        
                                                        if (!approvedMerchantQuotation) {
                                                            return <span className="text-xs text-gray-500">No approved quote</span>;
                                                        }
                                                        
                                                        // Parse product_prices if it's a string, otherwise use as is
                                                        const productPrices = typeof approvedMerchantQuotation.product_prices === 'string' 
                                                            ? JSON.parse(approvedMerchantQuotation.product_prices || '{}') 
                                                            : (approvedMerchantQuotation.product_prices || {});
                                                        
                                                        return (
                                                            <div className="text-sm text-gray-900">
                                                                <div className="mb-2">
                                                                    <div className="font-medium text-green-600 text-xs">Product Costs:</div>
                                                                    {Array.isArray(approvedMerchantQuotation.items) ? approvedMerchantQuotation.items.map((item, idx) => {
                                                                        const pricePerUnit = productPrices[idx] || 0;
                                                                        const totalForItem = pricePerUnit * (item.quantity || 1);
                                                                        
                                                                        return (
                                                                            <div key={idx} className="text-xs ml-2 mb-1">
                                                                                {item.product_name || item.product_id}: ₹{pricePerUnit} × {item.quantity} = ₹{totalForItem.toFixed(2)}
                                                                            </div>
                                                                        );
                                                                    }) : null}
                                                                </div>
                                                                <div className="border-t pt-1">
                                                                    <div className="text-xs">Transport: ₹{approvedMerchantQuotation.transport_cost ?? '-'}</div>
                                                                    <div className="text-xs">Custom: ₹{approvedMerchantQuotation.custom_work_cost ?? '-'}</div>
                                                                    <div className="text-xs font-medium text-blue-600">
                                                                        Total: ₹{approvedMerchantQuotation.total_quote_price ?? '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const latestQuotation = quotations
                                                            .filter(quotation => quotation.quotation_code === q.quotation_code)
                                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                                        
                                                        const status = latestQuotation?.status || q.status;
                                                        
                                                        if (status === 'pending') {
                                                            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">⏳ Pending</span>;
                                                        } else if (status === 'waiting_for_admin') {
                                                            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">👨‍💼 Admin Review</span>;
                                                        } else if (status === 'approved') {
                                                            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ Approved</span>;
                                                        } else if (status === 'rejected') {
                                                            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">❌ Rejected</span>;
                                                        } else if (status === 'completed') {
                                                            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">✅ Completed</span>;
                                                        }
                                                        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
                                                    })()}
                                    </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const approvedMerchantQuotation = quotations
                                                            .filter(quotation => 
                                                                quotation.quotation_code === q.quotation_code && 
                                                                quotation.merchant_code && 
                                                                quotation.status === 'approved'
                                                            )
                                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                                        
                                                        return approvedMerchantQuotation ? (
                                                            <span className="text-sm font-mono text-green-600 font-bold">
                                                                {approvedMerchantQuotation.merchant_code}
                                            </span>
                                        ) : (
                                                            <span className="text-sm text-gray-500">Not assigned</span>
                                                        );
                                                    })()}
                                    </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const latestQuotation = quotations
                                                            .filter(quotation => quotation.quotation_code === q.quotation_code)
                                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                                        
                                                        const approvedPrice = latestQuotation?.approved_price || q.approved_price;
                                                        
                                                        return approvedPrice ? (
                                                            <span className="text-sm font-bold text-green-600">₹{approvedPrice}</span>
                                        ) : (
                                                            <span className="text-sm text-gray-500">-</span>
                                                        );
                                                    })()}
                                    </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(q.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
                    </div>
                </div>

                {/* Orders Section */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">📦 Orders Management</h2>
                        <p className="text-sm text-gray-600 mt-1">View all orders and their items</p>
                    </div>
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading orders...</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No orders found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Items</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map(order => {
                                            const orderItemsForOrder = orderItems.filter(item => item.order_id === order.id);
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{order.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-mono text-gray-900">{order.user_id || 'Guest'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 max-w-xs">
                                                            {orderItemsForOrder.length > 0 ? (
                                                                orderItemsForOrder.map((item, idx) => {
                                                                    const product = products.find(p => p.id === item.product_id);
                                                                    return (
                                                                        <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border">
                                                                            <div className="flex items-center space-x-2 mb-1">
                                                                                {product?.image_url && (
                                                                                    <img 
                                                                                        src={product.image_url} 
                                                                                        alt={product.name || 'Product Image'} 
                                                                                        className="w-8 h-8 object-cover rounded" 
                                                                                        onError={(e) => {
                                                                                            e.currentTarget.style.display = 'none';
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                                <div className="font-medium text-xs">{product?.name || `Item ${idx + 1}`}</div>
                                                                            </div>
                                                                            <div className="text-xs text-gray-600 ml-2">
                                                                                <div>Product ID: {item.product_id}</div>
                                                                                <div>Quantity: {item.quantity}</div>
                                                                                <div className="text-green-600 font-medium">
                                                                                    Price: ₹{item.price}
                                                                                </div>
                                                                                <div className="text-blue-600 font-medium">
                                                                                    Total: ₹{(item.price * item.quantity).toFixed(2)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="text-xs text-gray-500">
                                                                    {order.cart_items ? (
                                                                        Array.isArray(order.cart_items) ? (
                                                                            order.cart_items.map((item: any, idx: number) => (
                                                                                <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border">
                                                                                    <div className="flex items-center space-x-2 mb-1">
                                                                                        {(item.image_url || item.image) && (
                                                                                            <img 
                                                                                                src={item.image_url || item.image || ''} 
                                                                                                alt={item.name || item.title || 'Product Image'} 
                                                                                                className="w-8 h-8 object-cover rounded" 
                                                                                                onError={(e) => {
                                                                                                    e.currentTarget.style.display = 'none';
                                                                                                }}
                                                                                            />
                                                                                        )}
                                                                                        <div className="font-medium text-xs">{item.name || item.title || `Item ${idx + 1}`}</div>
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-600 ml-2">
                                                                                        <div>Quantity: {item.quantity}</div>
                                                                                        <div className="text-green-600 font-medium">
                                                                                            Price: ₹{item.price || item.quotation_price}
                                                                                        </div>
                                                                                        <div className="text-blue-600 font-medium">
                                                                                            Total: ₹{((item.price || item.quotation_price || 0) * item.quantity).toFixed(2)}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="text-xs text-gray-500">Cart items data available</div>
                                                                        )
                                                                    ) : (
                                                                        <div className="text-xs text-gray-500">No items data</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-lg font-bold text-gray-900">₹{order.total_amount || 0}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {order.status || 'pending'}
                                                        </span>
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
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard; 