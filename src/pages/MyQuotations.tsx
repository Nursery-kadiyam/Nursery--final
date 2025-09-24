import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Check, Clock, X, ShoppingBag, Users, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { useCart } from '../contexts/CartContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '../contexts/AuthContext';

const MyQuotations: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth(); // Use the AuthContext instead of local state
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{[key: string]: any}>({});
  const [expandedQuotation, setExpandedQuotation] = useState<string | null>(null);
  const [showMerchantResponses, setShowMerchantResponses] = useState<boolean>(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [selectedMerchants, setSelectedMerchants] = useState<{[quotationId: string]: {[itemIndex: number]: string}}>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingMerchantResponses, setLoadingMerchantResponses] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  // New state for 3-column design
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [selectedPlants, setSelectedPlants] = useState<{[merchantCode: string]: any[]}>({});
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);

  // Status badge colors
  const statusColors: {[key: string]: string} = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'waiting_for_admin': 'bg-indigo-100 text-indigo-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'user_confirmed': 'bg-gray-100 text-gray-800',
    'order_placed': 'bg-blue-100 text-blue-800'
  };

  // Status display names
  const statusNames: {[key: string]: string} = {
    'pending': 'Pending',
    'waiting_for_admin': 'Admin Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'user_confirmed': 'User Confirmed',
    'order_placed': 'Order Placed'
  };

  // Fetch user and quotations function
  const fetchUserAndQuotations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch all quotations for the current user
      const quotationsPromise = supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_user_request', true) // Only fetch user requests, not merchant responses
        .order('created_at', { ascending: false });

      const result = await Promise.race([
        quotationsPromise,
        timeoutPromise
      ]) as any;
      
      const { data: quotationsData, error: quotationsError } = result;
      
      if (quotationsError) {
        console.error('Error fetching quotations:', quotationsError);
        setError(quotationsError.message);
        toast({ title: "Error", description: quotationsError.message, variant: "destructive" });
      } else if (quotationsData) {
        setQuotations(quotationsData);
        
        // Fetch all products to ensure we have them available for quotation items
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*');
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
          // Don't fail the entire request if products fail to load
        } else if (productsData) {
          const productsMap: {[key: string]: any} = {};
          productsData.forEach(product => {
            productsMap[product.id] = product;
          });
          setProducts(productsMap);
          console.log('Loaded products:', productsData.length);
        }
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      const errorMessage = error.message === 'Request timeout' 
        ? 'Request timed out. Please check your connection and try again.'
        : 'An unexpected error occurred';
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch user and quotations on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUserAndQuotations();
    } else {
      setLoading(false);
      setQuotations([]);
      setProducts({});
    }
  }, [user, fetchUserAndQuotations]);

  // Set up real-time subscription for quotation status changes
  useEffect(() => {
    if (!user) return;
    
      const quotationSubscription = supabase
        .channel(`user_quotations_${user.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'quotations',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('User quotation status changed:', payload);
            // Refresh quotations data when there's a change
            fetchUserAndQuotations();
          }
        )
        .subscribe();
        
      return () => {
        quotationSubscription.unsubscribe();
      };
  }, [user, fetchUserAndQuotations]);

  // Redirect to login if no user
  useEffect(() => {
    if (!user && !loading) {
      toast({ title: "Login Required", description: "Please login to view your quotations", variant: "destructive" });
      navigate('/');
    }
  }, [user, loading, toast, navigate]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get default plant image based on plant name
  const getDefaultPlantImage = (plantName: string) => {
    if (!plantName) return '/assets/placeholder.svg';
    
    // Map common plant names to their corresponding images
    const plantImageMap: {[key: string]: string} = {
      'golden bamboo': '/assets/golden bamboo.jpeg',
      'akalifa pink': '/assets/akalifa pink.jpeg',
      'arkeliform': '/assets/Arkeliform.jpeg',
      'ashoka': '/assets/Ashoka.jpeg',
      'bamboo': '/assets/Bamboo plants.jpeg',
      'boston fern': '/assets/Boston Fern.jpeg',
      'cassia': '/assets/Cassia Tree.jpeg',
      'croton': '/assets/Croton plant.jpeg',
      'gulmohar': '/assets/Gulmohar.jpeg',
      'neem': '/assets/Neem.jpeg',
      'rose': '/assets/Rose Bush.jpeg',
      'spider lily': '/assets/Spider lilly.jpeg',
      'star fruit': '/assets/Star fruit .jpeg',
      'terminalia': '/assets/Terminalia green.jpeg',
      'thailand ixora': '/assets/Thailand ixora.jpeg',
      'tiwan pink jama': '/assets/Tiwan pink jama.jpeg',
      'ujenia avenue': '/assets/Ujenia avenue.jpeg',
      'vepa': '/assets/Vepa.jpeg',
      'hibiscus': '/assets/lipstick red.jpeg',
      'ganuga': '/assets/ganuga.jpeg',
      'bogada': '/assets/Bogada.jpeg',
      'conacorpus': '/assets/ConaCorpus.jpeg',
      'conokarpas': '/assets/Conokarpas.jpeg',
      'cypress': '/assets/Cypress old.jpeg',
      'dianella grass': '/assets/Market nimma.jpeg',
      'dismodiya': '/assets/Market nimma.jpeg',
      'dracina': '/assets/Market nimma.jpeg',
      'drogun fruits': '/assets/Market nimma.jpeg',
      'ficus lyrata': '/assets/Market nimma.jpeg',
      'foxtail': '/assets/Market nimma.jpeg',
      'grandis': '/assets/Grandis.jpeg',
      'gulmohar avenue': '/assets/Gulmohar avenue plants.jpeg',
      'helikoniya': '/assets/Helikoniya.jpeg',
      'jatropha': '/assets/Jatropha.jpeg',
      'kaya': '/assets/kaya.jpeg',
      'kobbari': '/assets/kobbari.jpeg',
      'konacarpas': '/assets/Konacarpas.jpeg',
      'lipstick red': '/assets/lipstick red.jpeg',
      'mahagani': '/assets/Mahagani.jpeg',
      'mahatama': '/assets/mahatama.jpeg',
      'market nimma': '/assets/Market nimma.jpeg',
      'marri trees': '/assets/marri trees.jpeg',
      'micro carfa spiral': '/assets/Micro carfa spiral shape.jpeg',
      'micro multi balls': '/assets/Micro multi balls.jpeg',
      'mirchi mere green': '/assets/Mirchi mere green.jpeg',
      'mirchi mery gold': '/assets/Mirchi mery gold.jpeg',
      'noda': '/assets/Noda.jpeg',
      'pendanus': '/assets/pendanus.jpeg',
      'ravi': '/assets/Ravi.jpeg',
      'rela': '/assets/Rela.jpeg',
      'seetapalam': '/assets/Seetapalam.jpeg',
      'starlight': '/assets/Starlight.jpeg',
      'tabibiya roja': '/assets/Tabibiya roja.jpeg',
      'tabibiya rosea': '/assets/Tabibiya rosea.jpeg',
      'terminalia green': '/assets/Terminalia green.jpeg',
      'terminiliya': '/assets/Terminiliya.jpeg',
      'thailemon': '/assets/Thailemon .jpeg',
      'ujenia mini': '/assets/Ujniya mini.jpeg',
      'mango': '/assets/mango.jpeg',
      'banganapalli': '/assets/mango.jpeg',
      'banganapalli mango': '/assets/mango.jpeg',
      'hibiscus red': '/assets/lipstick red.jpeg'
    };
    
    const lowerPlantName = plantName.toLowerCase();
    for (const [key, imagePath] of Object.entries(plantImageMap)) {
      if (lowerPlantName.includes(key)) {
        return imagePath;
      }
    }
    
    return '/assets/placeholder.svg';
  };

  // Toggle expanded quotation
  const toggleExpand = (id: string) => {
    if (expandedQuotation === id) {
      setExpandedQuotation(null);
    } else {
      setExpandedQuotation(id);
    }
  };

  // Get merchant responses for a quotation with product data
  const getMerchantResponses = async (quotationCode: string) => {
    console.log(`🔍 Fetching merchant responses for quotation: ${quotationCode}`);
    
    // Try using the new function first
    const { data: functionResponses, error: functionError } = await supabase
      .rpc('get_quotation_responses_with_products', {
        p_quotation_code: quotationCode
      });
    
    if (functionError) {
      console.error('Error with function, falling back to direct query:', functionError);
      
      // Fallback to direct query
      const { data: directResponses, error: directError } = await supabase
        .from('quotations')
        .select('*')
        .eq('quotation_code', quotationCode)
        .not('merchant_code', 'is', null);
      
      if (directError) {
        console.error('Error fetching merchant responses:', directError);
        return [];
      }
      
      console.log(`📋 Direct query responses:`, directResponses);
      return directResponses || [];
    }
    
    console.log(`✅ Function responses:`, functionResponses);
    return functionResponses || [];
  };

    // View merchant responses
  const handleViewMerchantResponses = async (quotation: any) => {
    try {
      setLoadingMerchantResponses(true);
      setSelectedQuotation(quotation);
      const responses = await getMerchantResponses(quotation.quotation_code);
      setSelectedQuotation({ ...quotation, merchantResponses: responses });
      setShowMerchantResponses(true);
      // Clear any previous errors and selections when opening the dialog
      setError(null);
      setSelectedPlants({});
      setSelectedMerchant(null);
    } catch (error) {
      console.error('Error fetching merchant responses:', error);
      toast({ title: "Error", description: "Failed to fetch merchant responses", variant: "destructive" });
    } finally {
      setLoadingMerchantResponses(false);
    }
  };

  // Select merchant for a specific item
  const handleSelectMerchant = (quotationId: string, itemIndex: number, merchantCode: string) => {
    setSelectedMerchants(prev => ({
      ...prev,
      [quotationId]: {
        ...prev[quotationId],
        [itemIndex]: merchantCode
      }
    }));
    // Clear any previous errors when a merchant is selected
    setError(null);
  };

  // Place order with selected merchants
  const placeOrderWithSelectedMerchants = async (quotation: any) => {
    if (!selectedQuotation || !selectedQuotation.merchantResponses) {
      toast({ title: "Error", description: "Please view merchant responses first", variant: "destructive" });
      return;
    }

    // Prevent multiple simultaneous order placements
    if (placingOrder) {
      console.log('Order placement already in progress, skipping...');
      return;
    }

    // Add a unique key to prevent multiple simultaneous calls
    const orderKey = `order_${quotation.quotation_code}_${Date.now()}`;
    if ((window as any).orderPlacementInProgress) {
      console.log('Order placement already in progress for this quotation, skipping...');
      return;
    }
    (window as any).orderPlacementInProgress = orderKey;

    // Convert selectedPlants to selectedMerchants format for compatibility
    const selectedMerchantsForQuotation: {[itemIndex: number]: string} = {};
    Object.entries(selectedPlants).forEach(([merchantCode, plants]) => {
      plants.forEach((plant: any) => {
        selectedMerchantsForQuotation[plant.itemIdx] = merchantCode;
      });
    });

    const hasSelections = Object.keys(selectedMerchantsForQuotation).length > 0;

    if (!hasSelections) {
      setError("Please select plants from merchants for your order");
      toast({ title: "Error", description: "Please select plants from merchants for your order", variant: "destructive" });
      return;
    }

    // Clear any previous errors at the start
    setError(null);
    setPlacingOrder(true);

    try {
      // Step 1: Update quotation status to "user_confirmed" for selected merchants
      const selectedMerchantCodes = Object.values(selectedMerchantsForQuotation);
      
      // Update user quotation status to "user_confirmed"
      const { error: userQuotationError } = await supabase
        .from('quotations')
        .update({ 
          status: 'user_confirmed',
          selected_merchants: selectedMerchantCodes,
          user_confirmed_at: new Date().toISOString()
        })
        .eq('quotation_code', quotation.quotation_code)
        .eq('is_user_request', true);

      if (userQuotationError) {
        console.error('Error updating user quotation status:', userQuotationError);
        setError(`Failed to update quotation status: ${userQuotationError.message}`);
        toast({ title: "Error", description: "Failed to update quotation status", variant: "destructive" });
        return;
      }

      // Update selected merchant quotations status to "user_confirmed"
      const { error: merchantQuotationError } = await supabase
        .from('quotations')
        .update({ 
          status: 'user_confirmed',
          user_confirmed_at: new Date().toISOString()
        })
        .eq('quotation_code', quotation.quotation_code)
        .in('merchant_code', selectedMerchantCodes);

      if (merchantQuotationError) {
        console.error('Error updating merchant quotation status:', merchantQuotationError);
        setError(`Failed to update merchant quotation status: ${merchantQuotationError.message}`);
        toast({ title: "Error", description: "Failed to update merchant quotation status", variant: "destructive" });
        return;
      }

      // Step 2: Create cart items from selected plants
      const cartItems: any[] = [];
      
      console.log('Creating cart items from selected plants:', selectedPlants);
      console.log('Available products:', products);
      console.log('Available product names:', Object.values(products).map(p => p.name));
      
      // Check if we have any products loaded
      if (Object.keys(products).length === 0) {
        setError("No products found in database. Please ensure products are available before placing orders.");
        toast({ title: "Error", description: "No products found in database", variant: "destructive" });
        return;
      }
      
      // Convert selectedPlants to cart items
      Object.entries(selectedPlants).forEach(([merchantCode, plants]) => {
        console.log(`Processing plants for merchant ${merchantCode}:`, plants);
        
        const merchantResponse = selectedQuotation.merchantResponses.find((r: any) => 
          r.merchant_code === merchantCode
        );
        
        console.log(`Found merchant response for ${merchantCode}:`, merchantResponse);
        
        if (merchantResponse) {
          plants.forEach((plant: any) => {
            console.log(`Processing plant:`, plant);
            
            let product = products[plant.productId];
            console.log(`Product found by ID ${plant.productId}:`, product);
            
            // If product not found by ID, try to find by name
            if (!product && plant.name) {
              product = Object.values(products).find((p: any) => 
                p.name.toLowerCase() === plant.name.toLowerCase()
              );
              console.log(`Product found by name "${plant.name}":`, product);
            }
            
            if (product) {
              console.log(`Adding cart item for product:`, product.name);
              cartItems.push({
                id: product.id,
                name: product.name,
                price: plant.totalPrice, // This should be the total price for the quantity
                unit_price: plant.pricePerUnit, // This should be the price per unit
                image: product.image_url,
                quantity: plant.quantity,
                category: product.categories || 'other',
                quotation_id: quotation.id,
                quotation_code: quotation.quotation_code,
                selected_merchant: merchantCode,
                transport_cost: merchantResponse.transport_cost || 0,
                custom_work_cost: merchantResponse.custom_work_cost || 0
              });
            } else {
              console.warn(`Product not found for plant:`, plant);
              console.log(`Available product names:`, Object.values(products).map(p => p.name));
              // Create a fallback cart item with the plant data
              cartItems.push({
                id: plant.productId || 'unknown',
                name: plant.name,
                price: plant.totalPrice, // This should be the total price for the quantity
                unit_price: plant.pricePerUnit, // This should be the price per unit
                image: plant.image || '/assets/placeholder.svg',
                quantity: plant.quantity,
                category: 'other',
                quotation_id: quotation.id,
                quotation_code: quotation.quotation_code,
                selected_merchant: merchantCode,
                transport_cost: merchantResponse.transport_cost || 0,
                custom_work_cost: merchantResponse.custom_work_cost || 0
              });
            }
          });
        } else {
          console.warn(`Merchant response not found for merchant ${merchantCode}`);
        }
      });

      console.log('Created cart items:', cartItems);

      if (cartItems.length === 0) {
        setError("Could not create order items from selected plants. Please ensure you have selected plants from merchants and products exist in the database.");
        toast({ title: "Error", description: "Could not create order items from selected plants", variant: "destructive" });
        return;
      }

      // Step 3: Check if order already exists for this quotation
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_code')
        .eq('quotation_code', quotation.quotation_code)
        .eq('user_id', user.id)
        .is('parent_order_id', null)
        .single();

      if (existingOrder) {
        setError("An order already exists for this quotation");
        toast({ 
          title: "Order Already Exists", 
          description: `Order ${existingOrder.order_code} already exists for this quotation`, 
          variant: "destructive" 
        });
        return;
      }

      // Step 4: Create parent-child order structure
      if (!user) {
        setError("Please log in to place order");
        toast({ title: "Error", description: "Please log in to place order", variant: "destructive" });
        return;
      }

      // Group cart items by merchant for parent-child order structure
      const merchantGroups: { [merchantCode: string]: any[] } = {};
      cartItems.forEach(item => {
        const merchantCode = item.selected_merchant || 'admin';
        if (!merchantGroups[merchantCode]) {
          merchantGroups[merchantCode] = [];
        }
        merchantGroups[merchantCode].push(item);
      });

      console.log('Cart items:', cartItems);
      console.log('Merchant groups:', merchantGroups);
      console.log('Number of merchant groups:', Object.keys(merchantGroups).length);
      
      // Debug price calculations
      cartItems.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.price,
          calculated_total: (item.unit_price || 0) * (item.quantity || 1)
        });
      });

      // Calculate total amount for parent order (sum of all child subtotals)
      const totalChildSubtotals = Object.entries(merchantGroups).reduce((sum, [merchantCode, items]) => {
        const merchantSubtotal = items.reduce((itemSum, item) => itemSum + Number(item.price || 0), 0);
        return sum + merchantSubtotal;
      }, 0);

      // Create parent order
      const parentOrderPayload = {
        user_id: user.id,
        parent_order_id: null, // Parent order has no parent
        merchant_id: null, // Parent order has no merchant
        quotation_code: quotation.quotation_code,
        merchant_code: 'parent', // Special code for parent orders
        delivery_address: {},
        shipping_address: 'Default Address',
        total_amount: totalChildSubtotals, // Sum of all child subtotals
        subtotal: totalChildSubtotals, // Parent order subtotal equals total
        cart_items: cartItems,
        status: 'confirmed' // Orders are automatically confirmed when placed
      };

      console.log('Creating parent order with payload:', parentOrderPayload);
      
      const { data: parentOrderData, error: parentOrderError } = await supabase
        .from('orders')
        .insert([parentOrderPayload])
        .select('id, order_code')
        .single();

      if (parentOrderError) {
        console.error('Parent order save error:', parentOrderError);
        console.error('Error details:', {
          code: parentOrderError.code,
          message: parentOrderError.message,
          details: parentOrderError.details,
          hint: parentOrderError.hint
        });
        
        // Check if it's a duplicate order error
        if (parentOrderError.code === '23505' || parentOrderError.message.includes('duplicate')) {
          setError(`An order already exists for this quotation. Please check your orders page.`);
          toast({ 
            title: "Order Already Exists", 
            description: "An order already exists for this quotation. Please check your orders page.", 
            variant: "destructive" 
          });
        } else {
          setError(`Failed to create parent order: ${parentOrderError.message}. Error code: ${parentOrderError.code}`);
          toast({ 
            title: "Error", 
            description: `Failed to create parent order: ${parentOrderError.message}`, 
            variant: "destructive" 
          });
        }
        return;
      }

      console.log('Parent order created successfully:', parentOrderData);

      // Create child orders for each merchant
      const childOrderIds: string[] = [];
      
      for (const [merchantCode, items] of Object.entries(merchantGroups)) {
        // Get merchant_id from merchant_code
        let merchantId = null;
        console.log(`Processing merchant group: ${merchantCode} with ${items.length} items`);
        
        if (merchantCode !== 'admin') {
          console.log(`Looking up merchant with code: ${merchantCode}`);
          const { data: merchantData, error: merchantError } = await supabase
            .from('merchants')
            .select('id, merchant_code, nursery_name')
            .eq('merchant_code', merchantCode)
            .single();
          
          if (merchantError) {
            console.error(`Error fetching merchant ${merchantCode}:`, merchantError);
            // Continue with null merchant_id but log the error
          } else if (merchantData) {
            merchantId = merchantData.id;
            console.log(`Found merchant: ${merchantData.nursery_name} (${merchantData.merchant_code}) with ID: ${merchantId}`);
          } else {
            console.warn(`No merchant found with code: ${merchantCode}`);
          }
        } else {
          console.log('Admin merchant - no merchant_id needed');
        }
        
        // Calculate subtotal for this merchant
        const merchantSubtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
        
        const childOrderPayload = {
          user_id: user.id,
          parent_order_id: parentOrderData.id,
          merchant_id: merchantId,
          quotation_code: quotation.quotation_code,
          merchant_code: merchantCode,
          delivery_address: {},
          shipping_address: 'Default Address',
          total_amount: merchantSubtotal,
          subtotal: merchantSubtotal,
          cart_items: items,
          status: 'confirmed' // Orders are automatically confirmed when placed
        };
        
        console.log(`Creating child order for merchant ${merchantCode}:`, {
          merchant_id: merchantId,
          merchant_code: merchantCode,
          item_count: items.length,
          subtotal: merchantSubtotal
        });
        
        const { data: childOrderData, error: childOrderError } = await supabase
          .from('orders')
          .insert([childOrderPayload])
          .select('id, order_code')
          .single();
          
        if (childOrderError) {
          console.error(`Child order save error for ${merchantCode}:`, childOrderError);
          setError(`Failed to create order for merchant ${merchantCode}: ${childOrderError.message}`);
          toast({ title: "Error", description: `Failed to create order for merchant ${merchantCode}`, variant: "destructive" });
          return;
        }
        
        console.log(`Child order created successfully for ${merchantCode}:`, {
          order_id: childOrderData.id,
          order_code: childOrderData.order_code,
          merchant_id: merchantId
        });
        
        childOrderIds.push(childOrderData.id);
        
        // Insert order_items for this merchant's items
        const orderItems = items.map(item => {
          // For quotation items, we need to find the product_id from the quotation item data
          let productId = item.id; // Default to item.id
          
          if (item.quotation_id) {
            // This is a quotation item, find the product by name
            const product = Object.values(products).find((p: any) => 
              p.name.toLowerCase() === item.name.toLowerCase()
            );
            productId = product ? product.id : item.id; // Use item.id as fallback, not null
          }
          
          // Ensure we have a valid product_id
          if (!productId || productId === 'unknown') {
            console.warn(`No valid product_id found for item:`, item);
            // Try to find by name as last resort
            const productByName = Object.values(products).find((p: any) => 
              p.name.toLowerCase() === item.name.toLowerCase()
            );
            if (productByName) {
              productId = productByName.id;
            } else {
              console.warn(`Skipping order item creation for ${item.name} - no valid product found`);
              return null; // Skip this item
            }
          }
          
          return {
            order_id: childOrderData.id,
            product_id: productId,
            quantity: item.quantity,
            price: item.price,
            unit_price: item.unit_price || Math.round(item.price / item.quantity),
            subtotal: Number(item.price || 0),
            merchant_code: merchantCode,
            quotation_id: item.quotation_id || null
          };
        });
        
        // Filter out null items (items that couldn't be matched to products)
        const validOrderItems = orderItems.filter(item => item !== null);
        
        if (validOrderItems.length === 0) {
          console.warn(`No valid order items for merchant ${merchantCode} - skipping order items creation`);
        } else {
          const { error: orderItemsError } = await supabase
            .from('order_items')
            .insert(validOrderItems);
          
          if (orderItemsError) {
            console.error(`Order items save error for ${merchantCode}:`, orderItemsError);
            setError(`Failed to save order items for ${merchantCode}: ${orderItemsError.message}`);
            toast({ title: "Error", description: `Failed to save order items for ${merchantCode}`, variant: "destructive" });
            return;
          }
        }
      }

      if (childOrderIds.length === 0) {
        setError("Failed to create any child orders");
        toast({ title: "Error", description: "Failed to create any child orders", variant: "destructive" });
        return;
      }

      // Step 5: Update quotation status to "order_placed"
      const { error: orderPlacedError } = await supabase
        .from('quotations')
        .update({ 
          status: 'order_placed',
          order_placed_at: new Date().toISOString()
        })
        .eq('quotation_code', quotation.quotation_code);

      if (orderPlacedError) {
        console.error('Error updating quotation to order_placed:', orderPlacedError);
        // Continue even if this fails
      }

      // Step 6: Set cart and navigate to order summary
      localStorage.setItem('cart', JSON.stringify(cartItems));
      
      // Clear any errors on success
      setError(null);
      
      // Show success message with parent-child structure
      toast({
        title: "Order Placed Successfully!",
        description: `Parent Order: ${parentOrderData.order_code || parentOrderData.id} with ${childOrderIds.length} merchant orders`,
        variant: "default"
      });

      // Refresh quotations data to show updated statuses
      await fetchUserAndQuotations();
      
      // Navigate to order summary
      console.log('About to navigate to order summary page');
      navigate('/order-summary');
      console.log('Navigation command sent');
      
    } catch (error: any) {
      console.error('Error placing order:', error);
      const errorMessage = error.message || "Failed to place order. Please try again.";
      setError(errorMessage);
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setPlacingOrder(false);
      // Clear the order placement flag
      (window as any).orderPlacementInProgress = null;
    }
  };

  // Place order from approved quotation (legacy function for backward compatibility)
  const placeOrder = (quotation: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to place an order", variant: "destructive" });
      return;
    }

    if (quotation.status !== 'approved') {
      toast({ title: "Cannot Place Order", description: "You can only place orders for approved quotations", variant: "destructive" });
      return;
    }

    if (!Array.isArray(quotation.items) || quotation.items.length === 0) {
      toast({ title: "Error", description: "No items found in this quotation", variant: "destructive" });
      return;
    }

    try {
    // Create cart items from quotation
    const cartItems = quotation.items.map((item: any, index: number) => {
      const product = products[item.product_id];
      if (!product) return null;

      // Calculate individual item price from quotation
      let itemPrice = 0;
      let pricePerUnit = 0;
      
      if (quotation.unit_prices) {
        // Parse unit_prices if it's a string, otherwise use as is
        const unitPrices = typeof quotation.unit_prices === 'string'
            ? JSON.parse(quotation.unit_prices || '{}')
            : (quotation.unit_prices || {});
        pricePerUnit = unitPrices[index] || 0;
        itemPrice = pricePerUnit * item.quantity; // Price per unit × quantity
        } else if (quotation.approved_price) {
        // Fallback: distribute approved price equally
        pricePerUnit = quotation.approved_price / quotation.items.length;
        itemPrice = pricePerUnit * item.quantity;
        } else {
          toast({ title: "Error", description: "No pricing information available for this quotation", variant: "destructive" });
          return null;
      }

      return {
        id: product.id,
        name: product.name,
        price: itemPrice, // Individual item total price
        unit_price: pricePerUnit, // Unit price from quotation
        image: product.image_url,
        quantity: item.quantity,
        category: product.categories || 'other',
        quotation_id: quotation.id, // Reference to the quotation
        quotation_code: quotation.quotation_code,
        transport_cost: quotation.transport_cost || 0,
        custom_work_cost: quotation.custom_work_cost || 0,
        selected_merchant: quotation.merchant_code || 'admin' // For legacy orders, use admin as default
      };
    }).filter(Boolean);

    if (cartItems.length === 0) {
      toast({ title: "Error", description: "Could not create order items from this quotation", variant: "destructive" });
      return;
    }

    // Set cart with quotation items
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Navigate to order summary
    navigate('/order-summary');
    toast({ title: "Order Created", description: `Order created from quotation ${quotation.quotation_code}` });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: "Error", description: "Failed to create order. Please try again.", variant: "destructive" });
    }
  };

  // New functions for 3-column design
  const scrollToMerchantCard = (merchantCode: string) => {
    setSelectedMerchant(merchantCode);
    const element = document.getElementById(`merchant-${merchantCode}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isPlantSelected = (merchantCode: string, itemIdx: number) => {
    return selectedPlants[merchantCode]?.some((plant: any) => plant.itemIdx === itemIdx) || false;
  };

  const handlePlantSelection = (merchantCode: string, itemIdx: number, item: any, pricePerUnit: number, totalPrice: number) => {
    // Try to find product by ID first, then by name
    let product = products[item.product_id];
    let productId = item.product_id;
    
    if (!product && item.product_name) {
      // Find product by name if not found by ID
      product = Object.values(products).find((p: any) => 
        p.name.toLowerCase() === item.product_name.toLowerCase()
      );
      productId = product ? product.id : item.product_id;
    }
    
    // If still no product found, try to find by the item's name field
    if (!product && item.name) {
      product = Object.values(products).find((p: any) => 
        p.name.toLowerCase() === item.name.toLowerCase()
      );
      productId = product ? product.id : item.product_id;
    }
    
    console.log('Plant selection - Item:', item);
    console.log('Plant selection - Item product_id:', item.product_id);
    console.log('Plant selection - Item product_name:', item.product_name);
    console.log('Plant selection - Item name:', item.name);
    console.log('Plant selection - Found product:', product);
    console.log('Plant selection - Product ID:', productId);
    console.log('Plant selection - Available products count:', Object.keys(products).length);
    
    const plantData = {
      name: product ? product.name : (item.product_name || item.name || item.product_id || 'Unknown Product'),
      quantity: item.quantity || 1,
      pricePerUnit: pricePerUnit,
      totalPrice: totalPrice,
      itemIdx: itemIdx,
      merchantCode: merchantCode,
      productId: productId,
      image: product?.image_url || item.image_url || getDefaultPlantImage(item.product_name || item.name)
    };

    setSelectedPlants(prev => {
      const newPlants = { ...prev };
      if (!newPlants[merchantCode]) {
        newPlants[merchantCode] = [];
      }
      
      // Check if already selected
      const existingIndex = newPlants[merchantCode].findIndex(plant => plant.itemIdx === itemIdx);
      if (existingIndex === -1) {
        newPlants[merchantCode].push(plantData);
      }
      
      return newPlants;
    });
  };

  const removePlant = (merchantCode: string, plantIndex: number) => {
    setSelectedPlants(prev => {
      const newPlants = { ...prev };
      if (newPlants[merchantCode]) {
        newPlants[merchantCode].splice(plantIndex, 1);
        if (newPlants[merchantCode].length === 0) {
          delete newPlants[merchantCode];
        }
      }
      return newPlants;
    });
  };

  const getTotalPlants = () => {
    return Object.values(selectedPlants).reduce((total, plants) => total + plants.length, 0);
  };

  const getTotalPrice = () => {
    return Object.values(selectedPlants).reduce((total, plants) => {
      return total + plants.reduce((sum, plant) => sum + plant.totalPrice, 0);
    }, 0);
  };

  const isAllPlantsSelectedFromMerchant = (merchantCode: string, items: any[]) => {
    if (!selectedPlants[merchantCode] || selectedPlants[merchantCode].length === 0) {
      return false;
    }
    return items.every((item: any, itemIdx: number) => 
      selectedPlants[merchantCode]?.some((plant: any) => plant.itemIdx === itemIdx)
    );
  };

  const handleSelectAllFromMerchant = (merchantCode: string, items: any[], unitPrices: any) => {
    const parsedUnitPrices = typeof unitPrices === 'string' 
      ? JSON.parse(unitPrices || '{}') 
      : (unitPrices || {});

    const isAllSelected = isAllPlantsSelectedFromMerchant(merchantCode, items);

    if (isAllSelected) {
      // Deselect all plants from this merchant
      setSelectedPlants(prev => {
        const newPlants = { ...prev };
        delete newPlants[merchantCode];
        return newPlants;
      });
    } else {
      // Select all plants from this merchant
      const newPlants: any[] = [];
      
      items.forEach((item: any, itemIdx: number) => {
        const product = products[item.product_id];
        const pricePerUnit = parsedUnitPrices[itemIdx] || 0;
        const totalPrice = pricePerUnit * (item.quantity || 1);
        
        const plantData = {
          name: product ? product.name : (item.product_name || item.product_id || 'Unknown Product'),
          quantity: item.quantity || 1,
          pricePerUnit: pricePerUnit,
          totalPrice: totalPrice,
          itemIdx: itemIdx,
          merchantCode: merchantCode,
          productId: item.product_id,
          image: product?.image_url || item.image_url || getDefaultPlantImage(item.product_name)
        };
        newPlants.push(plantData);
      });

      setSelectedPlants(prev => ({
        ...prev,
        [merchantCode]: newPlants
      }));
    }
  };

  const handleShowOrderConfirmation = () => {
    setShowOrderConfirmation(true);
  };

  const handleOrderConfirmation = async () => {
    console.log('handleOrderConfirmation called');
    if (!selectedQuotation) {
      console.log('No selected quotation');
      return;
    }
    
    // Check if any plants are selected
    const totalSelectedPlants = Object.values(selectedPlants).reduce((total, plants) => total + plants.length, 0);
    console.log('Total selected plants:', totalSelectedPlants);
    
    if (totalSelectedPlants === 0) {
      setError("Please select plants from merchants before placing your order");
      toast({ 
        title: "No Selection", 
        description: "Please select plants from merchants before placing your order", 
        variant: "destructive" 
      });
      return;
    }

    // Create cart items for order summary with full specifications
    const cartItems: any[] = [];
    Object.entries(selectedPlants).forEach(([merchantCode, plants]) => {
      // Find the merchant response to get full item details
      const merchantResponse = selectedQuotation.merchantResponses.find((r: any) => 
        r.merchant_code === merchantCode
      );
      
      if (merchantResponse) {
        const unitPrices = typeof merchantResponse.unit_prices === 'string'
          ? JSON.parse(merchantResponse.unit_prices || '{}')
          : (merchantResponse.unit_prices || {});
        
        const modifiedSpecs = merchantResponse.modified_specifications || {};
        
        plants.forEach(plant => {
          const itemIdx = plant.itemIdx;
          const originalItem = merchantResponse.items[itemIdx];
          const itemModifiedSpecs = modifiedSpecs[itemIdx] || {};
          
          cartItems.push({
            id: plant.productId || 'unknown',
            name: plant.name,
            price: plant.totalPrice,
            unit_price: plant.pricePerUnit,
            image: plant.image,
            quantity: plant.quantity,
            category: 'other',
            quotation_id: selectedQuotation.id,
            quotation_code: selectedQuotation.quotation_code,
            selected_merchant: merchantCode,
            transport_cost: merchantResponse.transport_cost || 0,
            custom_work_cost: merchantResponse.custom_work_cost || 0,
            
            // Plant specifications
            plant_type: itemModifiedSpecs.plant_type || originalItem?.plant_type || '-',
            age_category: itemModifiedSpecs.age_category || originalItem?.age_category || '-',
            bag_size: itemModifiedSpecs.bag_size || originalItem?.bag_size || '-',
            height_range: itemModifiedSpecs.height_range || originalItem?.height_range || '-',
            stem_thickness: itemModifiedSpecs.stem_thickness || originalItem?.stem_thickness || '-',
            weight: itemModifiedSpecs.weight || originalItem?.weight || '-',
            variety: itemModifiedSpecs.variety || originalItem?.variety || '-',
            is_grafted: itemModifiedSpecs.is_grafted !== undefined ? itemModifiedSpecs.is_grafted : (originalItem?.is_grafted || false),
            delivery_timeline: itemModifiedSpecs.delivery_timeline || originalItem?.delivery_timeline || '-',
            
            // Merchant details
            merchant_name: merchantResponse.merchant_name || merchantCode,
            merchant_phone: merchantResponse.merchant_phone || '',
            estimated_delivery_days: merchantResponse.estimated_delivery_days || '-',
            
            // Original vs Modified indicators
            has_modified_specs: Object.keys(itemModifiedSpecs).length > 0,
            original_specs: {
              plant_type: originalItem?.plant_type || '-',
              age_category: originalItem?.age_category || '-',
              bag_size: originalItem?.bag_size || '-',
              height_range: originalItem?.height_range || '-',
              stem_thickness: originalItem?.stem_thickness || '-',
              weight: originalItem?.weight || '-',
              variety: originalItem?.variety || '-',
              is_grafted: originalItem?.is_grafted || false,
              delivery_timeline: originalItem?.delivery_timeline || '-'
            }
          });
        });
      }
    });

    console.log('Setting cart items for order summary:', cartItems);
    
    // Set cart data in localStorage for order summary page
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Close the confirmation modal
    setShowOrderConfirmation(false);
    
    // Navigate directly to order summary page
    console.log('Navigating directly to order summary page');
    navigate('/order-summary');
  };


  return (
    <TooltipProvider>
      <Navbar />
      <div className="min-h-screen bg-white font-montserrat">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-b from-emerald-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4 animate-fade-in">
              My Quotations
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              View your quotation requests and merchant responses
            </p>
          </div>
        </section>

        {/* Quotations List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-600">Loading your quotations...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <X className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 mt-2">Please try again or log in.</p>
                <div className="flex gap-4 justify-center mt-4">
                  <Button 
                    onClick={() => fetchUserAndQuotations()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Try Again
                  </Button>
                  <Link to="/">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2">
                      Go to Home
                    </Button>
                  </Link>
                </div>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-600 mb-4">No quotations found</h2>
                <p className="text-gray-500 mb-8">You haven't requested any quotations yet.</p>
                <Link to="/cart">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3">
                    Request a Quotation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {quotations.map((quotation) => (
                  <Card key={quotation.id} className={`shadow-sm hover:shadow-md border-0 overflow-hidden transition-all duration-300 ${expandedQuotation === quotation.id ? 'ring-2 ring-emerald-500' : ''}`}>
                    <CardContent className="p-0">
                      {/* Quotation Header */}
                      <div 
                        className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => toggleExpand(quotation.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-emerald-800 truncate">
                                {quotation.quotation_code}
                              </h3>
                              <Badge className={`${statusColors[quotation.status] || 'bg-gray-100'} text-xs sm:text-sm whitespace-nowrap`}>
                                {statusNames[quotation.status] || quotation.status}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">Requested on {formatDate(quotation.created_at)}</p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewMerchantResponses(quotation);
                              }}
                              variant="outline"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                              disabled={loadingMerchantResponses}
                            >
                              {loadingMerchantResponses ? (
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                              ) : (
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                              )}
                              {loadingMerchantResponses ? 'Loading...' : 'View Responses'}
                            </Button>
                            
                            {quotation.status === 'approved' && (
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  placeOrder(quotation);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 font-semibold text-sm sm:text-base w-full sm:w-auto"
                              >
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Place Order
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Content */}
                      {expandedQuotation === quotation.id && (
                        <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50 animate-fade-in">
                          <h4 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Quotation Details</h4>
                          
                          {/* Items Table */}
                          <div className="mb-4 sm:mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Requested Items</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Specifications</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Array.isArray(quotation.items) && quotation.items.map((item: any, index: number) => {
                                    const product = products[item.product_id];
                                    return (
                                      <TableRow key={index}>
                                        <TableCell>
                                          <div className="flex items-center space-x-3">
                                            {(product && product.image_url) || item.image_url || getDefaultPlantImage(item.product_name) ? (
                                              <img 
                                                src={product?.image_url || item.image_url || getDefaultPlantImage(item.product_name)} 
                                                alt={product ? product.name : (item.product_name || 'Plant')} 
                                                className="w-12 h-12 object-cover rounded-md"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder.svg'; }}
                                              />
                                            ) : (
                                              <div className="w-12 h-12 bg-emerald-100 rounded-md flex items-center justify-center">
                                                <span className="text-emerald-600 text-lg">🌱</span>
                                              </div>
                                            )}
                                            <span>{product ? product.name : (item.product_name || item.product_id || 'Unknown Product')}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                          <div className="space-y-1">
                                            {/* Plant Information */}
                                            {item.variety && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Variety:</span> {item.variety}
                                              </div>
                                            )}
                                            {item.plant_type && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Type:</span> {item.plant_type}
                                              </div>
                                            )}
                                            {item.age_category && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Age:</span> {item.age_category}
                                              </div>
                                            )}
                                            {item.height_range && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Height:</span> {item.height_range}
                                              </div>
                                            )}
                                            
                                            {/* Growth Details */}
                                            {item.stem_thickness && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Stem Thickness:</span> {item.stem_thickness}
                                              </div>
                                            )}
                                            {item.bag_size && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Bag Size:</span> {item.bag_size}
                                              </div>
                                            )}
                                            {item.is_grafted !== undefined && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Grafted:</span> {item.is_grafted ? 'Yes' : 'No'}
                                              </div>
                                            )}
                                            
                                            {/* Delivery Information */}
                                            {item.delivery_location && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Delivery:</span> {item.delivery_location}
                                              </div>
                                            )}
                                            {item.delivery_timeline && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Timeline:</span> {item.delivery_timeline}
                                              </div>
                                            )}
                                            
                                            {/* Legacy fields for backward compatibility */}
                                            {item.year && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Year:</span> {item.year}
                                              </div>
                                            )}
                                            {item.size && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Size:</span> {item.size}
                                              </div>
                                            )}
                                            
                                            {/* Notes */}
                                            {item.notes && (
                                              <div className="text-sm">
                                                <span className="text-gray-500">Notes:</span> {item.notes}
                                              </div>
                                            )}
                                            
                                            {/* Show "No specifications" only if none of the above fields are present */}
                                            {!item.variety && !item.plant_type && !item.age_category && !item.height_range && 
                                             !item.bag_size && item.is_grafted === undefined &&
                                             !item.delivery_location && !item.delivery_timeline && 
                                             !item.year && !item.size && !item.notes && (
                                              <span className="text-gray-400 text-sm">No specifications</span>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                          
                          {/* Status Timeline */}
                          <div className="mb-4 sm:mb-6">
                            <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${quotation.status !== 'rejected' ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Quotation Requested</p>
                                <p className="text-xs sm:text-sm text-gray-500">{formatDate(quotation.created_at)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-500 text-white">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Merchant Responses</p>
                                <p className="text-xs sm:text-sm text-gray-500">Merchants are responding to your quotation request</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 sm:space-x-4">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-300 text-gray-600">
                                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm sm:text-base">Select Merchants & Place Order</p>
                                <p className="text-xs sm:text-sm text-gray-500">Choose your preferred merchants for each item</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Merchant Responses Dialog - New 3-Column Design */}
      <Dialog open={showMerchantResponses} onOpenChange={(open) => {
        setShowMerchantResponses(open);
        if (!open) {
          setError(null); // Clear error when dialog closes
          setSelectedPlants({}); // Clear selected plants when dialog closes
          setSelectedMerchant(null); // Clear selected merchant
        }
      }}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 overflow-hidden m-0 rounded-none [&>button]:hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-green-700" />
                <div>
                  <DialogTitle className="text-green-700 text-xl font-semibold">
                    Merchant Responses - {selectedQuotation?.quotation_code}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 text-sm">
                    Select your preferred merchants for each plant and review your order
                  </DialogDescription>
                </div>
              </div>
              <button
                onClick={() => setShowMerchantResponses(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </DialogHeader>
          
          {selectedQuotation && (
            <>
              {/* Mobile Merchant Selector - Hidden on desktop */}
              <div className="lg:hidden bg-white border-b border-gray-200 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Merchants</h3>
                  <span className="text-sm text-gray-500">{selectedQuotation.merchantResponses?.length || 0} available</span>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {selectedQuotation.merchantResponses?.map((response: any) => (
                    <button
                      key={response.id}
                      onClick={() => scrollToMerchantCard(response.merchant_code)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedMerchant === response.merchant_code
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {response.merchant_code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 lg:grid lg:grid-cols-12 gap-0 min-h-0 flex flex-col lg:flex-row">
                {/* Left Sidebar - Merchants List - Hidden on mobile */}
                <div className="hidden lg:flex lg:col-span-2 bg-white border-r border-gray-200 flex-col min-h-0">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">Merchants ({selectedQuotation.merchantResponses?.length || 0})</h3>
                  <p className="text-xs text-gray-500 mt-1">Click to view quotations</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingMerchantResponses ? (
                    <div className="p-3 text-center">
                      <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-gray-600">Loading...</p>
                    </div>
                  ) : selectedQuotation.merchantResponses && selectedQuotation.merchantResponses.length > 0 ? (
                    <div className="space-y-1 p-2">
                      {selectedQuotation.merchantResponses.map((response: any, idx: number) => (
                        <button
                          key={response.id}
                          onClick={() => scrollToMerchantCard(response.merchant_code)}
                          className={`w-full text-left p-2 rounded-md transition-all ${
                            selectedMerchant === response.merchant_code
                              ? 'bg-red-50 border-l-3 border-red-600 text-red-700'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-red-600 font-medium text-xs">
                                {response.merchant_code.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{response.merchant_code}</p>
                              <p className="text-xs text-gray-500 truncate">
                                ₹{response.total_quote_price || 0} • {response.estimated_delivery_days || '-'}d
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center">
                      <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">No responses yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column - Merchant Quotations */}
              <div className="flex-1 lg:col-span-7 bg-gray-50 overflow-y-auto min-h-0 pb-20 lg:pb-0">
                <div className="p-4">
                  {loadingMerchantResponses ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading merchant responses...</p>
                    </div>
                  ) : selectedQuotation.merchantResponses && selectedQuotation.merchantResponses.length > 0 ? (
                    <div className="space-y-4">
                      {selectedQuotation.merchantResponses.map((response: any, responseIdx: number) => (
                        <div 
                          key={response.id} 
                          id={`merchant-${response.merchant_code}`}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                        >
                          {/* Merchant Card Header */}
                          <div className="p-4 bg-red-50 border-b border-red-200 rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-red-700 text-lg">{response.merchant_code}</h4>
                                <p className="text-sm text-red-600">
                                  Submitted: {new Date(response.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <p className="text-xl font-bold text-red-700">₹{response.total_quote_price || 0}</p>
                                  <p className="text-sm text-red-600">{response.estimated_delivery_days || '-'} days</p>
                                </div>
                                <button
                                  onClick={() => handleSelectAllFromMerchant(response.merchant_code, response.items, response.unit_prices)}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    isAllPlantsSelectedFromMerchant(response.merchant_code, response.items)
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                >
                                  {isAllPlantsSelectedFromMerchant(response.merchant_code, response.items) ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Merchant Card Body - Plant Table */}
                          <div className="p-4">
                            {/* Desktop Table - Hidden on mobile */}
                            <div className="hidden lg:block overflow-x-auto">
                              <table className="w-full min-w-[1000px]">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[180px]">Plant Name</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[70px]">Type</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[70px]">Age</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[70px]">Bag Size</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[80px]">Height</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[70px]">Qty</th>
                                    <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[100px]">Price</th>
                                    <th className="text-center py-3 px-3 font-semibold text-gray-700 min-w-[90px]">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.isArray(response.items_with_products || response.items) && (response.items_with_products || response.items).map((item: any, itemIdx: number) => {
                                    console.log(`🔍 Processing item ${itemIdx}:`, item);
                                    
                                    // Use the enhanced item data if available, otherwise fall back to original
                                    const enhancedItem = response.items_with_products ? item : {
                                      ...item,
                                      product_name: item.product_name || 'Unknown Product',
                                      product_image: item.product_image || '/assets/placeholder.svg'
                                    };
                                    
                                    // Try to find product by ID first, then by name matching
                                    let product = products[enhancedItem.product_id];
                                    if (!product && enhancedItem.product_name) {
                                      // Find product by name matching
                                      product = Object.values(products).find((p: any) => {
                                        if (!p || !p.name) return false;
                                        const productName = p.name.toLowerCase();
                                        const itemName = enhancedItem.product_name.toLowerCase();
                                        return productName === itemName || 
                                               productName.includes(itemName) || 
                                               itemName.includes(productName);
                                      });
                                    }
                                    const unitPrices = typeof response.unit_prices === 'string'
                                      ? JSON.parse(response.unit_prices || '{}')
                                      : (response.unit_prices || {});
                                    const pricePerUnit = unitPrices[itemIdx] || 0;
                                    
                                    // Get modified specifications from merchant response
                                    const modifiedSpecs = response.modified_specifications || {};
                                    const itemModifiedSpecs = modifiedSpecs[itemIdx] || {};
                                    
                                    // Merge user specifications with merchant modifications
                                    const finalSpecs = {
                                        plant_type: itemModifiedSpecs.plant_type || enhancedItem.plant_type || '-',
                                        age_category: itemModifiedSpecs.age_category || enhancedItem.age_category || '-',
                                        bag_size: itemModifiedSpecs.bag_size || enhancedItem.bag_size || '-',
                                        height_range: itemModifiedSpecs.height_range || enhancedItem.height_range || '-',
                                        variety: itemModifiedSpecs.variety || enhancedItem.variety || '-',
                                        delivery_location: itemModifiedSpecs.delivery_location || enhancedItem.delivery_location || '-',
                                        delivery_timeline: itemModifiedSpecs.delivery_timeline || enhancedItem.delivery_timeline || '-',
                                        is_grafted: itemModifiedSpecs.is_grafted || enhancedItem.is_grafted || '-',
                                        year: itemModifiedSpecs.year || enhancedItem.year || '-',
                                        size: itemModifiedSpecs.size || enhancedItem.size || '-'
                                    };
                                    
                                    const modifiedQuantity = itemModifiedSpecs.quantity || enhancedItem.quantity || 1;
                                    const totalForItem = pricePerUnit * modifiedQuantity;
                                    const isSelected = isPlantSelected(response.merchant_code, itemIdx);
                                    
                                    // Check if any specifications were modified
                                    const hasModifiedSpecs = Object.keys(itemModifiedSpecs).length > 0;
                                    
                                    console.log(`✅ Enhanced item ${itemIdx}:`, {
                                      product_name: enhancedItem.product_name,
                                      product_image: enhancedItem.product_image,
                                      product_id: enhancedItem.product_id,
                                      has_product: !!product,
                                      product_found: product ? {
                                        id: product.id,
                                        name: product.name,
                                        image_url: product.image_url
                                      } : null
                                    });
                                    
                                    return (
                                      <tr key={itemIdx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${itemIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center space-x-2">
                                            {(() => {
                                              // Try multiple image sources in order of preference
                                              const imageSources = [
                                                product?.image_url, // Use product image first
                                                enhancedItem.product_image,
                                                getDefaultPlantImage(enhancedItem.product_name),
                                                getDefaultPlantImage(product?.name),
                                                '/assets/placeholder.svg'
                                              ].filter(Boolean);
                                              
                                              const finalImageSrc = imageSources[0] || '/assets/placeholder.svg';
                                              
                                              console.log(`🖼️ Image sources for ${enhancedItem.product_name}:`, {
                                                product_image_url: product?.image_url,
                                                enhanced_item_image: enhancedItem.product_image,
                                                default_plant_image: getDefaultPlantImage(enhancedItem.product_name),
                                                final_src: finalImageSrc
                                              });
                                              
                                              return (
                                                <img 
                                                  src={finalImageSrc} 
                                                  alt={enhancedItem.product_name || product?.name || 'Plant'} 
                                                  className="w-7 h-7 object-cover rounded"
                                                  onError={(e) => { 
                                                    const target = e.target as HTMLImageElement;
                                                    console.log(`❌ Image failed to load: ${target.src}`);
                                                    // Try next image source if current one fails
                                                    const currentSrc = target.src;
                                                    const currentIndex = imageSources.indexOf(currentSrc);
                                                    if (currentIndex < imageSources.length - 1) {
                                                      target.src = imageSources[currentIndex + 1];
                                                      console.log(`🔄 Trying next image: ${target.src}`);
                                                    } else {
                                                      target.src = '/assets/placeholder.svg';
                                                      console.log(`🔄 Using placeholder: ${target.src}`);
                                                    }
                                                  }}
                                                  onLoad={(e) => {
                                                    console.log(`✅ Image loaded successfully: ${e.currentTarget.src}`);
                                                  }}
                                                />
                                              );
                                            })()}
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                              {enhancedItem.product_name || product?.name || 'Unknown Product'}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-gray-600">
                                          <div className="flex items-center space-x-1">
                                            <span className={itemModifiedSpecs.plant_type && itemModifiedSpecs.plant_type !== enhancedItem.plant_type ? 'text-red-600 font-semibold' : ''}>
                                              {finalSpecs.plant_type}
                                            </span>
                                            {itemModifiedSpecs.plant_type && itemModifiedSpecs.plant_type !== enhancedItem.plant_type && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span className="text-xs text-red-600 font-bold cursor-help">*</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">
                                                    <span className="font-semibold">Original:</span> {enhancedItem.plant_type || 'Not specified'}<br/>
                                                    <span className="font-semibold">Modified to:</span> {itemModifiedSpecs.plant_type}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-gray-600">
                                          <div className="flex items-center space-x-1">
                                            <span className={itemModifiedSpecs.age_category && itemModifiedSpecs.age_category !== enhancedItem.age_category ? 'text-red-600 font-semibold' : ''}>
                                              {finalSpecs.age_category}
                                            </span>
                                            {itemModifiedSpecs.age_category && itemModifiedSpecs.age_category !== enhancedItem.age_category && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span className="text-xs text-red-600 font-bold cursor-help">*</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">
                                                    <span className="font-semibold">Original:</span> {enhancedItem.age_category || 'Not specified'}<br/>
                                                    <span className="font-semibold">Modified to:</span> {itemModifiedSpecs.age_category}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-gray-600">
                                          <div className="flex items-center space-x-1">
                                            <span className={itemModifiedSpecs.bag_size && itemModifiedSpecs.bag_size !== enhancedItem.bag_size ? 'text-red-600 font-semibold' : ''}>
                                              {finalSpecs.bag_size}
                                            </span>
                                            {itemModifiedSpecs.bag_size && itemModifiedSpecs.bag_size !== enhancedItem.bag_size && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span className="text-xs text-red-600 font-bold cursor-help">*</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">
                                                    <span className="font-semibold">Original:</span> {enhancedItem.bag_size || 'Not specified'}<br/>
                                                    <span className="font-semibold">Modified to:</span> {itemModifiedSpecs.bag_size}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-gray-600">
                                          <div className="flex items-center space-x-1">
                                            <span className={itemModifiedSpecs.height_range && itemModifiedSpecs.height_range !== enhancedItem.height_range ? 'text-red-600 font-semibold' : ''}>
                                              {finalSpecs.height_range}
                                            </span>
                                            {itemModifiedSpecs.height_range && itemModifiedSpecs.height_range !== enhancedItem.height_range && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span className="text-xs text-red-600 font-bold cursor-help">*</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">
                                                    <span className="font-semibold">Original:</span> {enhancedItem.height_range || 'Not specified'}<br/>
                                                    <span className="font-semibold">Modified to:</span> {itemModifiedSpecs.height_range}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-gray-600 font-medium">
                                          <div className="flex items-center space-x-1">
                                            <span className={itemModifiedSpecs.quantity && itemModifiedSpecs.quantity !== enhancedItem.quantity ? 'text-red-600 font-semibold' : ''}>
                                              {itemModifiedSpecs.quantity || enhancedItem.quantity || 1}
                                            </span>
                                            {itemModifiedSpecs.quantity && itemModifiedSpecs.quantity !== enhancedItem.quantity && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span className="text-xs text-red-600 font-bold cursor-help">*</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="text-xs">
                                                    <span className="font-semibold">Original:</span> {enhancedItem.quantity || 1}<br/>
                                                    <span className="font-semibold">Modified to:</span> {itemModifiedSpecs.quantity}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">₹{pricePerUnit.toFixed(2)}</p>
                                            <p className="text-xs text-green-600">Total: ₹{totalForItem.toFixed(2)}</p>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <div className="flex flex-col items-center space-y-1">
                                            <button
                                              onClick={() => handlePlantSelection(response.merchant_code, itemIdx, item, pricePerUnit, totalForItem)}
                                              disabled={isSelected}
                                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                isSelected
                                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                              }`}
                                            >
                                              {isSelected ? 'Selected' : 'Select'}
                                            </button>
                                            {/* Show warning if there are modified specifications */}
                                            {Object.keys(itemModifiedSpecs).length > 0 && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <div className="flex items-center space-x-1 text-xs text-red-600 cursor-help">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                    <span className="font-medium">Modified Specs</span>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <div className="text-xs max-w-xs">
                                                    <p className="font-semibold mb-2">Merchant Modified Specifications:</p>
                                                    {Object.entries(itemModifiedSpecs).map(([key, value]) => (
                                                      <div key={key} className="mb-1">
                                                        <span className="font-medium">{key.replace('_', ' ')}:</span><br/>
                                                        <span className="text-gray-300">Original: {item[key] || 'Not specified'}</span><br/>
                                                        <span className="text-red-300">Modified: {String(value)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                          {/* Show additional modified specifications */}
                                          {(itemModifiedSpecs.delivery_timeline || itemModifiedSpecs.notes) && (
                                            <div className="mt-2 text-xs text-gray-500">
                                              {itemModifiedSpecs.delivery_timeline && (
                                                <div className="flex items-center space-x-1">
                                                  <Clock className="w-3 h-3" />
                                                  <span>{itemModifiedSpecs.delivery_timeline}</span>
                                                  {itemModifiedSpecs.delivery_timeline !== item.delivery_timeline && (
                                                    <span className="text-blue-600">(Modified)</span>
                                                  )}
                                                </div>
                                              )}
                                              {itemModifiedSpecs.notes && (
                                                <div className="mt-1">
                                                  <span className="text-gray-400">Notes: </span>
                                                  <span className="text-gray-600">{itemModifiedSpecs.notes}</span>
                                                  {itemModifiedSpecs.notes !== item.notes && (
                                                    <span className="text-blue-600 ml-1">(Modified)</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Mobile Card Layout - Hidden on desktop */}
                            <div className="lg:hidden mt-2 space-y-2">
                              {Array.isArray(response.items) && response.items.map((item: any, itemIdx: number) => {
                                // Try to find product by ID first, then by name matching
                                let product = products[item.product_id];
                                if (!product && item.product_name) {
                                  // Find product by name matching
                                  product = Object.values(products).find((p: any) => {
                                    if (!p || !p.name) return false;
                                    const productName = p.name.toLowerCase();
                                    const itemName = item.product_name.toLowerCase();
                                    return productName === itemName || 
                                           productName.includes(itemName) || 
                                           itemName.includes(productName);
                                  });
                                }
                                const unitPrices = typeof response.unit_prices === 'string'
                                  ? JSON.parse(response.unit_prices || '{}')
                                  : (response.unit_prices || {});
                                const pricePerUnit = unitPrices[itemIdx] || 0;
                                
                                // Get modified specifications from merchant response
                                const modifiedSpecs = response.modified_specifications || {};
                                const itemModifiedSpecs = modifiedSpecs[itemIdx] || {};
                                
                                // Merge user specifications with merchant modifications
                                const finalSpecs = {
                                    plant_type: itemModifiedSpecs.plant_type || item.plant_type || '-',
                                    age_category: itemModifiedSpecs.age_category || item.age_category || '-',
                                    bag_size: itemModifiedSpecs.bag_size || item.bag_size || '-',
                                    height_range: itemModifiedSpecs.height_range || item.height_range || '-',
                                    variety: itemModifiedSpecs.variety || item.variety || '-',
                                    delivery_location: itemModifiedSpecs.delivery_location || item.delivery_location || '-',
                                    delivery_timeline: itemModifiedSpecs.delivery_timeline || item.delivery_timeline || '-',
                                    is_grafted: itemModifiedSpecs.is_grafted || item.is_grafted || '-',
                                    year: itemModifiedSpecs.year || item.year || '-',
                                    size: itemModifiedSpecs.size || item.size || '-'
                                };
                                
                                const modifiedQuantity = itemModifiedSpecs.quantity || item.quantity || 1;
                                const totalForItem = pricePerUnit * modifiedQuantity;
                                const isSelected = isPlantSelected(response.merchant_code, itemIdx);
                                
                                // Check if any specifications were modified
                                const hasModifiedSpecs = Object.keys(itemModifiedSpecs).length > 0;
                                
                                return (
                                  <div key={itemIdx} className={`bg-white rounded-lg border-2 p-2 transition-all ${
                                    isSelected ? 'border-green-500 bg-green-50' : Object.keys(itemModifiedSpecs).length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        {(() => {
                                          // Try multiple image sources in order of preference
                                          const imageSources = [
                                            product?.image_url, // Use product image first
                                            item.image_url,
                                            getDefaultPlantImage(item.product_name),
                                            getDefaultPlantImage(product?.name),
                                            '/assets/placeholder.svg'
                                          ].filter(Boolean);
                                          
                                          const finalImageSrc = imageSources[0] || '/assets/placeholder.svg';
                                          
                                          console.log(`🖼️ Mobile image sources for ${item.product_name}:`, {
                                            product_image_url: product?.image_url,
                                            item_image: item.image_url,
                                            default_plant_image: getDefaultPlantImage(item.product_name),
                                            final_src: finalImageSrc
                                          });
                                          
                                          return (
                                            <img 
                                              src={finalImageSrc} 
                                              alt={product ? product.name : (item.product_name || 'Plant')} 
                                              className="w-8 h-8 object-cover rounded flex-shrink-0"
                                              onError={(e) => { 
                                                const target = e.target as HTMLImageElement;
                                                console.log(`❌ Mobile image failed to load: ${target.src}`);
                                                // Try next image source if current one fails
                                                const currentSrc = target.src;
                                                const currentIndex = imageSources.indexOf(currentSrc);
                                                if (currentIndex < imageSources.length - 1) {
                                                  target.src = imageSources[currentIndex + 1];
                                                  console.log(`🔄 Mobile trying next image: ${target.src}`);
                                                } else {
                                                  target.src = '/assets/placeholder.svg';
                                                  console.log(`🔄 Mobile using placeholder: ${target.src}`);
                                                }
                                              }}
                                              onLoad={(e) => {
                                                console.log(`✅ Mobile image loaded successfully: ${e.currentTarget.src}`);
                                              }}
                                            />
                                          );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-1">
                                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                                              {product ? product.name : (item.product_name || item.product_id || 'Unknown Product')}
                                            </h4>
                                            {Object.keys(itemModifiedSpecs).length > 0 && (
                                              <span className="text-red-600 font-bold text-xs">*</span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500">
                                            Qty: <span className={itemModifiedSpecs.quantity && itemModifiedSpecs.quantity !== item.quantity ? 'text-red-600 font-semibold' : ''}>
                                              {itemModifiedSpecs.quantity || item.quantity}
                                            </span> • ₹{pricePerUnit.toFixed(2)}/unit
                                          </p>
                                          {/* Show modified specifications in mobile view */}
                                          {Object.keys(itemModifiedSpecs).length > 0 && (
                                            <div className="mt-1 text-xs text-red-600">
                                              <span className="font-medium">Modified: </span>
                                              {Object.entries(itemModifiedSpecs).map(([key, value], idx) => (
                                                <span key={key}>
                                                  {key.replace('_', ' ')}: {String(value)}
                                                  {idx < Object.entries(itemModifiedSpecs).length - 1 ? ', ' : ''}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-2">
                                        <p className="text-sm font-bold text-green-700">₹{totalForItem.toFixed(2)}</p>
                                        <button
                                          onClick={() => handlePlantSelection(response.merchant_code, itemIdx, item, pricePerUnit, totalForItem)}
                                          disabled={isSelected}
                                          className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                            isSelected
                                              ? 'bg-green-600 text-white'
                                              : Object.keys(itemModifiedSpecs).length > 0
                                              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                          }`}
                                        >
                                          {isSelected ? '✓' : Object.keys(itemModifiedSpecs).length > 0 ? '⚠️' : '+'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-yellow-50 rounded-lg">
                      <Users className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                      <p className="text-yellow-800 font-medium">No merchant responses yet</p>
                      <p className="text-yellow-600 text-sm mt-1">Merchants will respond to your quotation request soon</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - User Quotation / Cart - Hidden on mobile */}
              <div className="hidden lg:flex lg:col-span-3 bg-white border-l border-gray-200 flex-col min-h-0">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Your Selection</h3>
                      <p className="text-sm text-gray-500">Review and place your order</p>
                    </div>
                    {Object.keys(selectedPlants).length > 0 && (
                      <button
                        onClick={() => setSelectedPlants({})}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {Object.keys(selectedPlants).length > 0 ? (
                    <div className="p-4 space-y-4">
                      {Object.entries(selectedPlants).map(([merchantCode, plants]) => (
                        <div key={merchantCode} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <h4 className="font-semibold text-green-700 mb-3 text-sm">{merchantCode}</h4>
                          <div className="space-y-2">
                            {plants.map((plant: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{plant.name}</p>
                                  <p className="text-xs text-gray-500">Qty: {plant.quantity} • ₹{plant.pricePerUnit}/unit</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-semibold text-green-700">₹{plant.totalPrice}</span>
                                  <button
                                    onClick={() => removePlant(merchantCode, idx)}
                                    className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-2 border-t border-gray-300">
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-gray-700">Subtotal:</span>
                              <span className="text-green-700">
                                ₹{plants.reduce((sum: number, plant: any) => sum + plant.totalPrice, 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No plants selected yet</p>
                      <p className="text-xs text-gray-500 mt-1">Select plants from merchant quotations</p>
                    </div>
                  )}
                </div>

                {/* Sticky Submit Button */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Plants:</span>
                      <span className="font-medium">{getTotalPlants()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Merchants:</span>
                      <span className="font-medium">{Object.keys(selectedPlants).length}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-green-700 pt-2 border-t border-gray-200">
                      <span>Total Price:</span>
                      <span>₹{getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleShowOrderConfirmation}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold rounded-lg transition-colors"
                    disabled={Object.keys(selectedPlants).length === 0 || placingOrder}
                  >
                    {placingOrder ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Submit Quotation
                      </>
                    )}
                  </Button>
                </div>
              </div>
              </div>

              {/* Mobile Bottom Sheet - User Selection */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-200 shadow-2xl z-20">
                <div className="p-3">
                  {/* Selection Summary */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Your Selection</h3>
                        <p className="text-sm text-gray-600">
                          {getTotalPlants()} plants • {Object.keys(selectedPlants).length} merchants
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-700">₹{getTotalPrice().toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Selected Items Preview */}
                  {Object.keys(selectedPlants).length > 0 && (
                    <div className="mb-4 max-h-24 overflow-y-auto">
                      <div className="space-y-1">
                        {Object.entries(selectedPlants).slice(0, 2).map(([merchantCode, plants]) => (
                          <div key={merchantCode} className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{merchantCode}</span>
                              <span className="text-sm text-green-600">{plants.length} items</span>
                            </div>
                          </div>
                        ))}
                        {Object.keys(selectedPlants).length > 2 && (
                          <div className="text-center text-sm text-gray-500">
                            +{Object.keys(selectedPlants).length - 2} more merchants
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <Button
                    onClick={handleShowOrderConfirmation}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 font-bold text-lg rounded-xl shadow-lg transition-all"
                    disabled={Object.keys(selectedPlants).length === 0 || placingOrder}
                  >
                    {placingOrder ? (
                      <>
                        <div className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 mr-3" />
                        Submit Quotation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Modal */}
      <Dialog open={showOrderConfirmation} onOpenChange={setShowOrderConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-green-700" />
              <span>Confirm Order</span>
            </DialogTitle>
            <DialogDescription>
              Review your order details before placing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Total Plants:</span>
                <span>{getTotalPlants()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Total Merchants:</span>
                <span>{Object.keys(selectedPlants).length}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-700 text-lg">
                <span>Total Price:</span>
                <span>₹{getTotalPrice().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>You are placing an order with {Object.keys(selectedPlants).length} merchant(s).</p>
              <p>Total {getTotalPlants()} plants for ₹{getTotalPrice().toFixed(2)}.</p>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={() => setShowOrderConfirmation(false)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Confirm Order button clicked');
                handleOrderConfirmation();
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={placingOrder}
            >
              {placingOrder ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Confirm Order'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
};

export default MyQuotations;