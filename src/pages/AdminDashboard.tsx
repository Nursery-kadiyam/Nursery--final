import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Users, 
    ShoppingCart, 
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
    X,
    Download,
    Printer
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [merchants, setMerchants] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [merchantsLoading, setMerchantsLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [merchantQuotations, setMerchantQuotations] = useState<any[]>([]);
    const [approvedPrice, setApprovedPrice] = useState<{ [id: string]: number }>({});
    const [editingApprovedPriceId, setEditingApprovedPriceId] = useState<string | null>(null);
    const [editedApprovedPrice, setEditedApprovedPrice] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState<boolean>(false);

    const handleCloseDashboard = () => {
        navigate('/');
    };

    const refreshOrdersData = async () => {
        try {
            setOrdersLoading(true);
            console.log('Refreshing orders data...');
            
            // Check if we're authenticated as admin
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('Current user (refresh):', user);
            console.log('Auth error (refresh):', authError);
            
            if (authError) {
                console.error('Authentication error during refresh:', authError);
                toast({
                    title: "Authentication Error",
                    description: "Please log in again",
                    variant: "destructive"
                });
                setOrdersLoading(false);
                return;
            }
            
            // Test basic database access first
            const { data: testData, error: testError } = await supabase
                .from('orders')
                .select('count', { count: 'exact', head: true });
            
            console.log('Test query result:', testData);
            console.log('Test query error:', testError);
            
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            const { data: orderItemsData, error: orderItemsError } = await supabase
                .from('order_items')
                .select('*');
            
            console.log('Refresh - Orders data:', ordersData);
            console.log('Refresh - Orders error:', ordersError);
            console.log('Refresh - Order items data:', orderItemsData);
            console.log('Refresh - Order items error:', orderItemsError);
            
            if (!ordersError && !orderItemsError) {
                setOrders(ordersData || []);
                setOrderItems(orderItemsData || []);
                toast({
                    title: "Orders Refreshed!",
                    description: `Found ${ordersData?.length || 0} orders`,
                    variant: "default"
                });
            } else {
                console.error('Error refreshing orders:', ordersError || orderItemsError);
                toast({
                    title: "Refresh Failed",
                    description: ordersError?.message || orderItemsError?.message || "Could not refresh orders data",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Unexpected error during refresh:', error);
            toast({
                title: "Refresh Failed",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setOrdersLoading(false);
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                console.log('AdminDashboard: Starting data fetch...');
                
                // Add timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
                );
                
                // Check authentication first
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                console.log('Current user:', user);
                console.log('Auth error:', authError);
                
                if (authError) {
                    console.error('Authentication error:', authError);
                    setLoading(false);
                    return;
                }
                
                // Fetch data with better error handling and timeout
                const dataFetchPromise = Promise.all([
                    supabase.from('quotations').select('*'),
                    supabase.from('merchants').select('*'),
                    supabase.from('orders').select('*').order('created_at', { ascending: false }),
                    supabase.from('order_items').select('*'),
                    supabase.from('products').select('*')
                ]);
                
                const results = await Promise.race([dataFetchPromise, timeoutPromise]);
                
                const [
                    { data: quotationsData, error: quotationsError },
                    { data: merchantsData, error: merchantsError },
                    { data: ordersData, error: ordersError },
                    { data: orderItemsData, error: orderItemsError },
                    { data: productsData, error: productsError }
                ] = results as any;
                
                // Debug logging
                console.log('AdminDashboard - Data fetch results:');
                console.log('Orders data:', ordersData);
                console.log('Orders error:', ordersError);
                console.log('Order items data:', orderItemsData);
                console.log('Order items error:', orderItemsError);
                console.log('Quotations data:', quotationsData);
                console.log('Merchants data:', merchantsData);
                console.log('Products data:', productsData);
                
                // Set data regardless of errors to show what we have
                setQuotations(quotationsData || []);
                setMerchants(merchantsData || []);
                setOrders(ordersData || []);
                setOrderItems(orderItemsData || []);
                setProducts(productsData || []);
                
                // Set merchant quotations
                const merchantCodes = merchantsData?.map((m: any) => m.merchant_code).filter(Boolean) || [];
                setMerchantQuotations((quotationsData || []).filter((q: any) => 
                    merchantCodes.includes(q.merchant_code) && q.status === 'waiting_for_admin'
                ));
                
                // Log any errors but don't fail completely
                if (quotationsError) console.error('Quotations error:', quotationsError);
                if (merchantsError) console.error('Merchants error:', merchantsError);
                if (ordersError) console.error('Orders error:', ordersError);
                if (orderItemsError) console.error('Order items error:', orderItemsError);
                if (productsError) console.error('Products error:', productsError);
                
                console.log('AdminDashboard: Data fetch completed');
                
            } catch (error) {
                console.error('AdminDashboard: Error during data fetch:', error);
                // Set empty arrays to prevent infinite loading
                setQuotations([]);
                setMerchants([]);
                setOrders([]);
                setOrderItems([]);
                setProducts([]);
                setMerchantQuotations([]);
            } finally {
                setLoading(false);
                setOrdersLoading(false); // Fix: Set ordersLoading to false after initial fetch
            }
        };
        
        fetchAll();
        
        // Set up real-time subscription for orders
        const ordersSubscription = supabase
            .channel('orders_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'orders' }, 
                (payload) => {
                    console.log('Orders table changed:', payload);
                    // Refresh orders data when there's a change
                    fetchAll();
                }
            )
            .subscribe();
            
        return () => {
            ordersSubscription.unsubscribe();
        };
    }, []); // Remove actionLoading dependency to prevent unnecessary re-fetches

    useEffect(() => {
        const fetchMerchants = async () => {
            setMerchantsLoading(true);
                const { data, error } = await supabase
                    .from('merchants')
                    .select('*');
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
        
        // Update merchant quotation status
        const { error: updateMerchantError } = await supabase
            .from('quotations')
            .update({ 
                status: 'approved', 
                approved_price: approvedPrice[q.id],
                updated_at: new Date().toISOString()
            })
            .eq('id', q.id);
            
        // Update original user quotation status to 'admin approved'
        const { error: updateUserQuotationError } = await supabase
            .from('quotations')
            .update({ 
                status: 'admin approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', originalQuotation.id);
            
        setActionLoading(null);
        
        if (!updateMerchantError && !updateUserQuotationError) {
            setApprovedPrice(prev => {
                const newState = { ...prev };
                delete newState[q.id];
                return newState;
            });
            const { data: quotationsData } = await supabase
                .from('quotations')
                .select('*');
            setQuotations(quotationsData || []);
            const merchantCodes = merchants.map((m: any) => m.merchant_code).filter(Boolean);
            setMerchantQuotations(quotationsData?.filter((q: any) => 
                merchantCodes.includes(q.merchant_code) && q.status === 'waiting_for_admin'
            ) || []);
            toast({
                title: "Quotation Approved!",
                description: `Quotation ${originalQuotation.quotation_code} has been approved by admin and status updated.`,
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
                .select('*');
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
        const { data: quotationsData } = await supabase.from('quotations').select('*');
        setQuotations(quotationsData || []);
    };

    const handleViewOrderDetails = (order: any) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
    };

    const handleCloseOrderDetails = () => {
        setSelectedOrder(null);
        setShowOrderDetails(false);
    };

    const updateQuotationStatusToOrderPlaced = async (quotationCode: string) => {
        try {
            const { error } = await supabase
                .from('quotations')
                .update({ 
                    status: 'user order placed',
                    updated_at: new Date().toISOString()
                })
                .eq('quotation_code', quotationCode)
                .is('merchant_code', null); // Only update user quotations, not merchant quotations

            if (!error) {
                // Refresh quotations data
                const { data: quotationsData } = await supabase.from('quotations').select('*');
                setQuotations(quotationsData || []);
                
                toast({
                    title: "Status Updated!",
                    description: `Quotation ${quotationCode} status updated to 'User Order Placed'`,
                    variant: "default"
                });
            } else {
                console.error('Error updating quotation status:', error);
                toast({
                    title: "Error",
                    description: "Failed to update quotation status",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error updating quotation status:', error);
            toast({
                title: "Error",
                description: "Failed to update quotation status",
                variant: "destructive"
            });
        }
    };

    const handlePrintOrder = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow && selectedOrder) {
            const orderItemsForOrder = orderItems.filter(item => item.order_id === selectedOrder.id);
            let productCostsTotal = 0;
            
            if (orderItemsForOrder.length > 0) {
                productCostsTotal = orderItemsForOrder.reduce((sum, item) => {
                    const unitPrice = item.unit_price || 25;
                    return sum + (unitPrice * item.quantity);
                }, 0);
            } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
                productCostsTotal = selectedOrder.cart_items.reduce((sum: number, item: any) => {
                    const unitPrice = item.price || item.unit_price || 25;
                    return sum + (unitPrice * item.quantity);
                }, 0);
            }
            
            const transportTotal = selectedOrder.cart_items ? 
                selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.transport_cost || 0), 0) : 0;
            const customWorkTotal = selectedOrder.cart_items ? 
                selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.custom_work_cost || 0), 0) : 0;

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Order Details - ${selectedOrder.order_code || selectedOrder.id}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                        
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        
                        body { 
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            line-height: 1.6; 
                            color: #1f2937; 
                            background: #ffffff;
                            margin: 0;
                            padding: 0;
                        }
                        
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 40px 20px;
                        }
                        
                        .header {
                            text-align: center;
                            margin-bottom: 40px;
                            padding-bottom: 30px;
                            border-bottom: 3px solid #3b82f6;
                            position: relative;
                        }
                        
                        .header::before {
                            content: '';
                            position: absolute;
                            bottom: -3px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 100px;
                            height: 3px;
                            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                        }
                        
                        .company-logo {
                            font-size: 28px;
                            font-weight: 700;
                            color: #1e40af;
                            margin-bottom: 10px;
                            letter-spacing: -0.5px;
                        }
                        
                        .company-tagline {
                            font-size: 14px;
                            color: #6b7280;
                            margin-bottom: 20px;
                            font-weight: 400;
                        }
                        
                        .document-title {
                            font-size: 32px;
                            font-weight: 600;
                            color: #111827;
                            margin-bottom: 8px;
                        }
                        
                        .order-code {
                            font-size: 18px;
                            font-weight: 500;
                            color: #374151;
                            margin-bottom: 8px;
                            font-family: 'Courier New', monospace;
                        }
                        
                        .generated-date {
                            font-size: 14px;
                            color: #9ca3af;
                            font-weight: 400;
                        }
                        
                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 24px;
                            margin-bottom: 40px;
                        }
                        
                        .info-card {
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 24px;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        
                        .info-card h3 {
                            font-size: 16px;
                            font-weight: 600;
                            color: #1e40af;
                            margin-bottom: 16px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 0;
                            border-bottom: 1px solid #f1f5f9;
                        }
                        
                        .info-row:last-child {
                            border-bottom: none;
                        }
                        
                        .info-label {
                            font-weight: 500;
                            color: #4b5563;
                            font-size: 14px;
                        }
                        
                        .info-value {
                            font-weight: 600;
                            color: #111827;
                            font-size: 14px;
                        }
                        
                        .amount {
                            color: #059669;
                            font-weight: 700;
                        }
                        
                        .section-title {
                            font-size: 20px;
                            font-weight: 600;
                            color: #111827;
                            margin-bottom: 20px;
                            padding-bottom: 8px;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 40px;
                            background: white;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                        }
                        
                        .items-table th {
                            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                            color: white;
                            font-weight: 600;
                            padding: 16px 12px;
                            text-align: left;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .items-table td {
                            padding: 16px 12px;
                            border-bottom: 1px solid #f3f4f6;
                            font-size: 14px;
                        }
                        
                        .items-table tr:nth-child(even) {
                            background: #f9fafb;
                        }
                        
                        .items-table tr:hover {
                            background: #f3f4f6;
                        }
                        
                        .product-name {
                            font-weight: 600;
                            color: #111827;
                        }
                        
                        .quantity {
                            text-align: center;
                            font-weight: 500;
                        }
                        
                        .price {
                            font-weight: 600;
                            color: #059669;
                        }
                        
                        .total-price {
                            font-weight: 700;
                            color: #1e40af;
                        }
                        
                        .summary-section {
                            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                            border: 1px solid #bae6fd;
                            border-radius: 12px;
                            padding: 24px;
                            margin-bottom: 30px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                        }
                        
                        .summary-title {
                            font-size: 20px;
                            font-weight: 600;
                            color: #0c4a6e;
                            margin-bottom: 20px;
                            text-align: center;
                        }
                        
                        .summary-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 12px 0;
                            font-size: 16px;
                            border-bottom: 1px solid #e0f2fe;
                        }
                        
                        .summary-row:last-child {
                            border-bottom: none;
                        }
                        
                        .summary-label {
                            font-weight: 500;
                            color: #0c4a6e;
                        }
                        
                        .summary-value {
                            font-weight: 600;
                            color: #059669;
                        }
                        
                        .summary-total {
                            border-top: 2px solid #0c4a6e;
                            padding-top: 16px;
                            margin-top: 16px;
                            font-size: 20px;
                            font-weight: 700;
                            color: #0c4a6e;
                        }
                        
                        .summary-total .summary-value {
                            color: #0c4a6e;
                            font-size: 22px;
                        }
                        
                        .address-section {
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            border: 1px solid #f59e0b;
                            border-radius: 12px;
                            padding: 24px;
                        }
                        
                        .address-title {
                            font-size: 16px;
                            font-weight: 600;
                            color: #92400e;
                            margin-bottom: 16px;
                        }
                        
                        .address-content {
                            font-size: 14px;
                            line-height: 1.8;
                            color: #78350f;
                        }
                        
                        .footer {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #e5e7eb;
                            text-align: center;
                            font-size: 12px;
                            color: #9ca3af;
                        }
                        
                        .status-badge {
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .status-pending {
                            background: #fef3c7;
                            color: #92400e;
                        }
                        
                        .status-processing {
                            background: #dbeafe;
                            color: #1e40af;
                        }
                        
                        .status-delivered {
                            background: #d1fae5;
                            color: #065f46;
                        }
                        
                        @media print {
                            body { margin: 0; padding: 20px; }
                            .container { max-width: none; padding: 0; }
                            .info-card { break-inside: avoid; }
                            .items-table { break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="company-logo">🌱 Nursery Management System</div>
                            <div class="company-tagline">Professional Plant Solutions & Garden Care</div>
                            <div class="document-title">Order Details</div>
                            <div class="order-code">${selectedOrder.order_code || selectedOrder.id}</div>
                            <div class="generated-date">Generated on: ${new Date().toLocaleString()}</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-card">
                                <h3>Order Information</h3>
                                <div class="info-row">
                                    <span class="info-label">Order Code:</span>
                                    <span class="info-value">${selectedOrder.order_code || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">User ID:</span>
                                    <span class="info-value">${selectedOrder.user_id || 'Guest'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Status:</span>
                                    <span class="info-value">
                                        <span class="status-badge status-${selectedOrder.status || 'pending'}">${selectedOrder.status || 'pending'}</span>
                                    </span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Created:</span>
                                    <span class="info-value">${new Date(selectedOrder.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div class="info-card">
                                <h3>Order Statistics</h3>
                                <div class="info-row">
                                    <span class="info-label">Total Items:</span>
                                    <span class="info-value">${orderItemsForOrder.length > 0 ? orderItemsForOrder.length : (selectedOrder.cart_items ? selectedOrder.cart_items.length : 0)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Order Type:</span>
                                    <span class="info-value">${selectedOrder.user_id ? 'Registered User' : 'Guest User'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Payment Status:</span>
                                    <span class="info-value">${selectedOrder.payment_status || 'Pending'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-title">📦 Order Items</div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 40%;">Product Name</th>
                                    <th style="width: 15%; text-align: center;">Quantity</th>
                                    <th style="width: 20%; text-align: right;">Unit Price</th>
                                    <th style="width: 25%; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    if (orderItemsForOrder.length > 0) {
                                        return orderItemsForOrder.map((item, idx) => {
                                            const product = products.find(p => p.id === item.product_id);
                                            const unitPrice = item.unit_price || product?.price || 25;
                                            const total = unitPrice * item.quantity;
                                            return `
                                                <tr>
                                                    <td class="product-name">${product?.name || `Item ${idx + 1}`}</td>
                                                    <td class="quantity" style="text-align: center;">${item.quantity}</td>
                                                    <td class="price" style="text-align: right;">₹${unitPrice}</td>
                                                    <td class="total-price" style="text-align: right;">₹${total.toFixed(2)}</td>
                                                </tr>
                                            `;
                                        }).join('');
                                    } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
                                        return selectedOrder.cart_items.map((item: any, idx: number) => {
                                            const unitPrice = item.price || item.unit_price || 25;
                                            const total = unitPrice * item.quantity;
                                            return `
                                                <tr>
                                                    <td class="product-name">${item.name || item.title || `Item ${idx + 1}`}</td>
                                                    <td class="quantity" style="text-align: center;">${item.quantity}</td>
                                                    <td class="price" style="text-align: right;">₹${unitPrice}</td>
                                                    <td class="total-price" style="text-align: right;">₹${total.toFixed(2)}</td>
                                                </tr>
                                            `;
                                        }).join('');
                                    }
                                    return '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #6b7280;">No items found</td></tr>';
                                })()}
                            </tbody>
                        </table>
                        
                        <div class="summary-section">
                            <div class="summary-title">💰 Order Summary</div>
                            <div class="summary-row">
                                <span class="summary-label">Products Cost:</span>
                                <span class="summary-value">₹${productCostsTotal.toFixed(2)}</span>
                            </div>
                            ${transportTotal > 0 ? `
                                <div class="summary-row">
                                    <span class="summary-label">Transport Cost:</span>
                                    <span class="summary-value">₹${transportTotal.toFixed(2)}</span>
                                </div>
                            ` : ''}
                            ${customWorkTotal > 0 ? `
                                <div class="summary-row">
                                    <span class="summary-label">Custom Work Cost:</span>
                                    <span class="summary-value">₹${customWorkTotal.toFixed(2)}</span>
                                </div>
                            ` : ''}
                            <div class="summary-row summary-total">
                                <span class="summary-label">Total Amount:</span>
                                <span class="summary-value">₹${(productCostsTotal + transportTotal + customWorkTotal).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        ${selectedOrder.delivery_address ? `
                            <div class="address-section">
                                <div class="address-title">📍 Delivery Address</div>
                                <div class="address-content">
                                    ${typeof selectedOrder.delivery_address === 'string' ? 
                                        `<p>${selectedOrder.delivery_address}</p>` :
                                        `<p><strong>${selectedOrder.delivery_address.name || ''}</strong></p>
                                         <p>📞 ${selectedOrder.delivery_address.phone || ''}</p>
                                         <p>${selectedOrder.delivery_address.addressLine1 || ''}</p>
                                         <p>${selectedOrder.delivery_address.addressLine2 || ''}</p>
                                         <p>${selectedOrder.delivery_address.city || ''}, ${selectedOrder.delivery_address.state || ''} - ${selectedOrder.delivery_address.pincode || ''}</p>`
                                    }
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="footer">
                            <p>This document was generated automatically by the Nursery Management System</p>
                            <p>For any queries, please contact our support team</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    const handleDownloadOrder = () => {
        if (!selectedOrder) return;
        
        const orderItemsForOrder = orderItems.filter(item => item.order_id === selectedOrder.id);
        let productCostsTotal = 0;
        
        if (orderItemsForOrder.length > 0) {
            productCostsTotal = orderItemsForOrder.reduce((sum, item) => {
                const unitPrice = item.unit_price || 25;
                return sum + (unitPrice * item.quantity);
            }, 0);
        } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
            productCostsTotal = selectedOrder.cart_items.reduce((sum: number, item: any) => {
                const unitPrice = item.price || item.unit_price || 25;
                return sum + (unitPrice * item.quantity);
            }, 0);
        }
        
        const transportTotal = selectedOrder.cart_items ? 
            selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.transport_cost || 0), 0) : 0;
        const customWorkTotal = selectedOrder.cart_items ? 
            selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.custom_work_cost || 0), 0) : 0;

        // Create CSV content
        const csvContent = [
            ['Order Details'],
            ['Order Code', selectedOrder.order_code || 'N/A'],
            ['User ID', selectedOrder.user_id || 'Guest'],
            ['Status', selectedOrder.status || 'pending'],
            ['Created At', new Date(selectedOrder.created_at).toLocaleString()],
            [''],
            ['Order Items'],
            ['Product', 'Quantity', 'Unit Price', 'Total'],
            ...(() => {
                if (orderItemsForOrder.length > 0) {
                    return orderItemsForOrder.map((item, idx) => {
                        const product = products.find(p => p.id === item.product_id);
                        const unitPrice = item.unit_price || product?.price || 25;
                        const total = unitPrice * item.quantity;
                        return [
                            product?.name || `Item ${idx + 1}`,
                            item.quantity,
                            `₹${unitPrice}`,
                            `₹${total.toFixed(2)}`
                        ];
                    });
                } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
                    return selectedOrder.cart_items.map((item: any, idx: number) => {
                        const unitPrice = item.price || item.unit_price || 25;
                        const total = unitPrice * item.quantity;
                        return [
                            item.name || item.title || `Item ${idx + 1}`,
                            item.quantity,
                            `₹${unitPrice}`,
                            `₹${total.toFixed(2)}`
                        ];
                    });
                }
                return [['No items found', '', '', '']];
            })(),
            [''],
            ['Order Summary'],
            ['Products Cost', `₹${productCostsTotal.toFixed(2)}`],
            ['Transport Cost', `₹${transportTotal.toFixed(2)}`],
            ['Custom Work Cost', `₹${customWorkTotal.toFixed(2)}`],
            ['Total Amount', `₹${(productCostsTotal + transportTotal + customWorkTotal).toFixed(2)}`],
            [''],
            ['Delivery Address'],
            ...(() => {
                if (selectedOrder.delivery_address) {
                    if (typeof selectedOrder.delivery_address === 'string') {
                        return [['Address', selectedOrder.delivery_address]];
                    } else {
                        return [
                            ['Name', selectedOrder.delivery_address.name || ''],
                            ['Phone', selectedOrder.delivery_address.phone || ''],
                            ['Address Line 1', selectedOrder.delivery_address.addressLine1 || ''],
                            ['Address Line 2', selectedOrder.delivery_address.addressLine2 || ''],
                            ['City', selectedOrder.delivery_address.city || ''],
                            ['State', selectedOrder.delivery_address.state || ''],
                            ['Pincode', selectedOrder.delivery_address.pincode || '']
                        ];
                    }
                }
                return [['No address provided', '']];
            })()
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `order_${selectedOrder.order_code || selectedOrder.id}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const approvedMerchants = merchants.filter(m => m.status === 'approved').length;
    const pendingQuotations = merchantQuotations.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                            <p className="text-gray-600 text-lg">Manage your nursery business operations</p>
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
                                    <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                                    <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                            </div>
                                <DollarSign className="w-12 h-12 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Approved Merchants</p>
                                    <p className="text-3xl font-bold">{approvedMerchants}</p>
                        </div>
                                <Users className="w-12 h-12 text-green-200" />
                    </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm font-medium">Pending Orders</p>
                                    <p className="text-3xl font-bold">{pendingOrders}</p>
                            </div>
                                <ShoppingCart className="w-12 h-12 text-orange-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Pending Reviews</p>
                                    <p className="text-3xl font-bold">{pendingQuotations}</p>
                        </div>
                                <FileText className="w-12 h-12 text-purple-200" />
                    </div>
                        </CardContent>
                    </Card>
                            </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-white shadow-lg">
                        <TabsTrigger value="overview" className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="merchants" className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Merchants</span>
                        </TabsTrigger>
                        <TabsTrigger value="quotations" className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>Quotations</span>
                        </TabsTrigger>
                        <TabsTrigger value="orders" className="flex items-center space-x-2">
                            <Package className="w-4 h-4" />
                            <span>Orders</span>
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>Analytics</span>
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
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                                    ) : orders.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No orders found</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {orders.slice(0, 5).map(order => (
                                                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-900">Order #{order.order_code || 'N/A'}</p>
                                                        <p className="text-sm text-gray-500">₹{order.total_amount || 0}</p>
                        </div>
                                                    <Badge variant={
                                                        order.status === 'pending' ? 'secondary' :
                                                        order.status === 'delivered' ? 'default' :
                                                        'outline'
                                                    }>
                                                        {order.status || 'pending'}
                                                    </Badge>
                    </div>
                                            ))}
                            </div>
                                    )}
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
                                    {merchantQuotations.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No pending reviews</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {merchantQuotations.slice(0, 5).map(q => (
                                                <div key={q.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{q.quotation_code}</p>
                                                        <p className="text-sm text-gray-500">{q.merchant_code}</p>
                            </div>
                                                    <Badge variant="outline" className="text-orange-600">
                                                        Review Needed
                                                    </Badge>
                        </div>
                                            ))}
                    </div>
                                    )}
                                </CardContent>
                            </Card>
                </div>
                    </TabsContent>

                    {/* Merchants Tab */}
                    <TabsContent value="merchants" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="w-5 h-5" />
                                    <span>Merchants Management</span>
                                </CardTitle>
                                <CardDescription>Approve or reject merchant applications</CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                                            <Badge variant={
                                                                m.status === 'approved' ? 'default' :
                                                                m.status === 'rejected' ? 'destructive' :
                                                                'secondary'
                                                            }>
                                                        {m.status}
                                                            </Badge>
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
                            </CardContent>
                        </Card>
                    </TabsContent>

                                        {/* Quotations Tab */}
                    <TabsContent value="quotations" className="space-y-6">
                        {/* User Quotations Section */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5" />
                                    <span>User Quotations</span>
                                </CardTitle>
                                <CardDescription>All quotations submitted by users</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-600">Loading user quotations...</p>
                                    </div>
                                ) : quotations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No user quotations found.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation Code</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {quotations.filter(q => !q.merchant_code).map(q => (
                                                    <tr key={q.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{q.user_email || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-500">User ID: {q.user_id}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{q.quotation_code}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900 max-w-xs">
                                                                {Array.isArray(q.items) ? q.items.map((item, idx) => {
                                                                    const product = products.find(p => p.id === item.product_id);
                                                                    
                                                                    // Find approved merchant quotation for this user quotation
                                                                    const approvedQuotation = quotations.find(aq => 
                                                                        aq.quotation_code === q.quotation_code && 
                                                                        aq.merchant_code && 
                                                                        aq.status === 'approved'
                                                                    );
                                                                    
                                                                    // Get approved pricing if available
                                                                    let approvedPricePerUnit = 0;
                                                                    let approvedTotal = 0;
                                                                    if (approvedQuotation && approvedQuotation.unit_prices) {
            const unitPrices = typeof approvedQuotation.unit_prices === 'string'
                ? JSON.parse(approvedQuotation.unit_prices || '{}')
                : (approvedQuotation.unit_prices || {});
                                                                                                                                                 approvedPricePerUnit = unitPrices[idx] || 0;
                                                                        approvedTotal = approvedPricePerUnit * (item.quantity || 1);
                                                                    }
                                                                    
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
                                                                                {approvedQuotation ? (
                                                                                    <>
                                                                                        <div className="text-green-600 font-medium">
                                                                                            Approved Price: ₹{approvedPricePerUnit.toFixed(2)} per unit
                                                                                        </div>
                                                                                        <div className="text-blue-600 font-medium">
                                                                                            Total: ₹{approvedTotal.toFixed(2)}
                                                                                        </div>
                                                                                        <div className="text-xs text-gray-500">
                                                                                            Merchant: {approvedQuotation.merchant_code}
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="text-orange-600 font-medium">
                                                                                        No approved pricing yet
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }) : '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Badge variant={
                                                                q.status === 'pending' ? 'secondary' :
                                                                q.status === 'admin approved' ? 'default' :
                                                                q.status === 'user order placed' ? 'default' :
                                                                q.status === 'approved' ? 'default' :
                                                                q.status === 'user_confirmed' ? 'outline' :
                                                                q.status === 'rejected' ? 'destructive' :
                                                                'outline'
                                                            }>
                                                                {q.status === 'user_confirmed' ? 'User Confirmed' : 
                                                                 q.status === 'admin approved' ? 'Admin Approved' : 
                                                                 q.status === 'user order placed' ? 'User Order Placed' : 
                                                                 (q.status || 'pending')}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {new Date(q.created_at).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(q.created_at).toLocaleTimeString()}
                                                            </div>
                                                            {q.status === 'admin approved' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => updateQuotationStatusToOrderPlaced(q.quotation_code)}
                                                                    className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                                                                >
                                                                    Mark Order Placed
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Merchant Quotations Section */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5" />
                                    <span>Merchant Quotations (Pending Review)</span>
                                </CardTitle>
                                <CardDescription>Review and approve merchant quotations</CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                                                                const unitPrices = typeof q.unit_prices === 'string'
                                                                        ? JSON.parse(q.unit_prices || '{}') 
                                                                        : (q.unit_prices || {});
                                                                                                                                          const pricePerUnit = unitPrices[idx] || 0;
                                                                    const totalForItem = pricePerUnit * (item.quantity || 1);
                                                                    
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
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Orders Tab */}
                    <TabsContent value="orders" className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                    <Package className="w-5 h-5" />
                                    <span>Orders Management</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button 
                                            onClick={refreshOrdersData}
                                            disabled={ordersLoading}
                                            variant="outline"
                                            size="sm"
                                        >
                                            {ordersLoading ? 'Refreshing...' : 'Refresh Orders'}
                                        </Button>
                                        <Button 
                                            onClick={async () => {
                                                console.log('Testing database connection...');
                                                
                                                // Test 1: Check if table exists and has any data
                                                const { count, error: countError } = await supabase
                                                    .from('orders')
                                                    .select('*', { count: 'exact', head: true });
                                                console.log('Count test:', { count, countError });
                                                
                                                // Test 2: Try to get actual orders
                                                const { data: ordersData, error: ordersError } = await supabase
                                                    .from('orders')
                                                    .select('*')
                                                    .limit(5);
                                                console.log('Orders test:', { ordersData, ordersError });
                                                
                                                // Test 3: Check RLS policies
                                                const { data: { user } } = await supabase.auth.getUser();
                                                console.log('Current user for RLS test:', user);
                                                
                                                const result = {
                                                    count,
                                                    countError,
                                                    ordersData,
                                                    ordersError,
                                                    user: user?.id
                                                };
                                                
                                                console.log('Comprehensive test result:', result);
                                                toast({
                                                    title: "Database Test",
                                                    description: countError ? `Count Error: ${countError.message}` : 
                                                               ordersError ? `Orders Error: ${ordersError.message}` :
                                                               `Success: ${count || 0} orders found, ${ordersData?.length || 0} retrieved`,
                                                    variant: (countError || ordersError) ? "destructive" : "default"
                                                });
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600"
                                        >
                                            Test DB
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>View all orders and their items</CardDescription>
                            </CardHeader>
                            <CardContent>
                        {ordersLoading ? (
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Items</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <div className="text-gray-500">
                                                        <div className="text-lg font-medium mb-2">No orders found</div>
                                                        <div className="text-sm">Orders will appear here once customers place them</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map(order => {
                                            const orderItemsForOrder = orderItems.filter(item => item.order_id === order.id);
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{order.order_code || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-mono text-gray-900">{order.user_id || 'Guest'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900">
                                                            {(() => {
                                                                const itemCount = orderItemsForOrder.length > 0 
                                                                    ? orderItemsForOrder.length 
                                                                    : (order.cart_items && Array.isArray(order.cart_items) 
                                                                        ? order.cart_items.length 
                                                                        : 0);
                                                                
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
                                        })
                                        )}
                        </tbody>
                    </table>
                </div>
            )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <TrendingUp className="w-5 h-5" />
                                        <span>Revenue Analytics</span>
                                    </CardTitle>
                                    <CardDescription>Monthly revenue trends</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">Revenue analytics coming soon...</p>
                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <BarChart3 className="w-5 h-5" />
                                        <span>Order Statistics</span>
                                    </CardTitle>
                                    <CardDescription>Order status distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Pending</span>
                                            <Badge variant="secondary">{pendingOrders}</Badge>
                </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Processing</span>
                                            <Badge variant="outline">{orders.filter(o => o.status === 'processing').length}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Delivered</span>
                                            <Badge variant="default">{orders.filter(o => o.status === 'delivered').length}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Cancelled</span>
                                            <Badge variant="destructive">{orders.filter(o => o.status === 'cancelled').length}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Order Details Dialog */}
            <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Package className="w-5 h-5" />
                            <span>Order Details - {selectedOrder?.order_code || selectedOrder?.id}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Complete details of order items and information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Order Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-gray-900">Order Code</h4>
                                    <p className="text-sm text-gray-600">{selectedOrder.order_code || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">User ID</h4>
                                    <p className="text-sm text-gray-600 font-mono">{selectedOrder.user_id || 'Guest'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Total Amount</h4>
                                    <p className="text-lg font-bold text-green-600">₹{selectedOrder.total_amount || 0}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Status</h4>
                                    <Badge variant={
                                        selectedOrder.status === 'pending' ? 'secondary' :
                                        selectedOrder.status === 'processing' ? 'default' :
                                        selectedOrder.status === 'shipped' ? 'outline' :
                                        selectedOrder.status === 'delivered' ? 'default' :
                                        selectedOrder.status === 'cancelled' ? 'destructive' :
                                        'outline'
                                    }>
                                        {selectedOrder.status || 'pending'}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Created At</h4>
                                    <p className="text-sm text-gray-600">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                                {(() => {
                                    const orderItemsForOrder = orderItems.filter(item => item.order_id === selectedOrder.id);
                                    
                                    if (orderItemsForOrder.length > 0) {
                                        return (
                                            <div className="grid gap-4">
                                                {orderItemsForOrder.map((item, idx) => {
                                                    const product = products.find(p => p.id === item.product_id);
                                                    return (
                                                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50">
                                                            {/* Simple Layout Like My Orders */}
                                                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-3">
                                                                <img 
                                                                    src={product?.image_url || '/assets/placeholder.svg'} 
                                                                    alt={product?.name || 'Product Image'} 
                                                                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0" 
                                                                    onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">{product?.name || `Item ${idx + 1}`}</p>
                                                                    <p className="text-sm text-gray-600">
                                                                        Quantity: {item.quantity}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Detailed Information */}
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Product ID:</span>
                                                                    <p className="font-mono text-xs mt-1 break-all">{item.product_id}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Quantity:</span>
                                                                    <p className="font-semibold mt-1">{item.quantity}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Unit Price:</span>
                                                                    <p className="font-semibold text-green-600 mt-1">₹{item.unit_price || product?.price || 25}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Total:</span>
                                                                    <p className="font-bold text-blue-600 mt-1">₹{((item.unit_price || product?.price || 25) * item.quantity).toFixed(2)}</p>
                                                                </div>
                                                            </div>


                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
                                        return (
                                            <div className="grid gap-4">
                                                {selectedOrder.cart_items.map((item: any, idx: number) => (
                                                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50">
                                                        {/* Simple Layout Like My Orders */}
                                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-3">
                                                            <img 
                                                                src={(item.image_url || item.image) && ((item.image_url || item.image).startsWith('http') || (item.image_url || item.image).startsWith('/assets/')) 
                                                                    ? (item.image_url || item.image) : '/assets/placeholder.svg'} 
                                                                alt={item.name || item.title || 'Product Image'} 
                                                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0" 
                                                                onError={e => { e.currentTarget.src = '/assets/placeholder.svg'; }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 truncate">{item.name || item.title || `Item ${idx + 1}`}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    Quantity: {item.quantity}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Detailed Information */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                                            <div>
                                                                <span className="text-gray-500 font-medium">Quantity:</span>
                                                                <p className="font-semibold mt-1">{item.quantity}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 font-medium">Price:</span>
                                                                <p className="font-semibold text-green-600 mt-1">₹{item.price || item.unit_price || 25}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 font-medium">Total:</span>
                                                                <p className="font-bold text-blue-600 mt-1">₹{((item.price || item.unit_price || 25) * item.quantity).toFixed(2)}</p>
                                                            </div>
                                                            {item.quotation_id && (
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Quotation ID:</span>
                                                                    <p className="font-mono text-xs mt-1 break-all">{item.quotation_id}</p>
                                                                </div>
                                                            )}
                                                        </div>


                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No items data available for this order</p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>

                            {/* Order Summary with Product Costs, Transport and Custom Work Costs */}
                            {(() => {
                                // Calculate product costs from order items
                                const orderItemsForOrder = orderItems.filter(item => item.order_id === selectedOrder.id);
                                let productCostsTotal = 0;
                                
                                if (orderItemsForOrder.length > 0) {
                                    productCostsTotal = orderItemsForOrder.reduce((sum, item) => {
                                        const unitPrice = item.unit_price || 25;
                                        return sum + (unitPrice * item.quantity);
                                    }, 0);
                                } else if (selectedOrder.cart_items && Array.isArray(selectedOrder.cart_items)) {
                                    productCostsTotal = selectedOrder.cart_items.reduce((sum: number, item: any) => {
                                        const unitPrice = item.price || item.unit_price || 25;
                                        return sum + (unitPrice * item.quantity);
                                    }, 0);
                                }
                                
                                // Calculate additional costs
                                const transportTotal = selectedOrder.cart_items ? 
                                    selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.transport_cost || 0), 0) : 0;
                                const customWorkTotal = selectedOrder.cart_items ? 
                                    selectedOrder.cart_items.reduce((sum: number, item: any) => sum + (item.custom_work_cost || 0), 0) : 0;
                                
                                return (
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Products Cost</span>
                                                <span className="font-medium">₹{productCostsTotal.toFixed(2)}</span>
                                            </div>
                                            {transportTotal > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Transport Cost</span>
                                                    <span className="font-medium">₹{transportTotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {customWorkTotal > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Custom Work Cost</span>
                                                    <span className="font-medium">₹{customWorkTotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-200 pt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-gray-900">Total Order Amount</span>
                                                    <span className="font-bold text-lg text-green-600">
                                                        ₹{(productCostsTotal + transportTotal + customWorkTotal).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Delivery Address */}
                            {selectedOrder.delivery_address && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h3>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        {typeof selectedOrder.delivery_address === 'string' ? (
                                            <p className="text-gray-700">{selectedOrder.delivery_address}</p>
                                        ) : selectedOrder.delivery_address && typeof selectedOrder.delivery_address === 'object' ? (
                                            <div className="space-y-2">
                                                {selectedOrder.delivery_address.name && (
                                                    <p className="font-medium text-gray-900">{selectedOrder.delivery_address.name}</p>
                                                )}
                                                {selectedOrder.delivery_address.phone && (
                                                    <p className="text-gray-700">{selectedOrder.delivery_address.phone}</p>
                                                )}
                                                {selectedOrder.delivery_address.addressLine1 && (
                                                    <p className="text-gray-700">{selectedOrder.delivery_address.addressLine1}</p>
                                                )}
                                                {selectedOrder.delivery_address.addressLine2 && (
                                                    <p className="text-gray-700">{selectedOrder.delivery_address.addressLine2}</p>
                                                )}
                                                <p className="text-gray-700">
                                                    {selectedOrder.delivery_address.city && <span>{selectedOrder.delivery_address.city}, </span>}
                                                    {selectedOrder.delivery_address.state && <span>{selectedOrder.delivery_address.state} </span>}
                                                    {selectedOrder.delivery_address.pincode && <span>- {selectedOrder.delivery_address.pincode}</span>}
                                                </p>
                                                {selectedOrder.delivery_address.addressType && (
                                                    <p className="text-sm text-gray-500">({selectedOrder.delivery_address.addressType})</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">No address provided</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                <div className="flex space-x-3">
                                    <Button 
                                        variant="outline" 
                                        onClick={handlePrintOrder}
                                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Print Order</span>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={handleDownloadOrder}
                                        className="flex items-center space-x-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download CSV</span>
                                    </Button>
                                </div>
                                <Button variant="outline" onClick={handleCloseOrderDetails}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboard; 