import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
    }

    const { customer, order, cartItems, userId } = body;

    if (!customer || !order || !cartItems) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Ensure cartItems is always an array
    const items = Array.isArray(cartItems) ? cartItems : [cartItems];

    // Set up Supabase client
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine if the user is a guest or authenticated
    let guestUserId = null;
    let authUserId = userId || null;

    if (!authUserId && customer.email) {
        // This is a guest user, so upsert into guest_users
        const { data: guest, error: guestError } = await supabase
            .from('guest_users')
            .upsert([
                {
                    email: customer.email,
                    first_name: customer.firstName,
                    last_name: customer.lastName,
                    phone: customer.phone,
                    delivery_address: customer.deliveryAddress,
                    shipping_address: customer.shippingAddress,
                },
            ], { onConflict: 'email' })
            .select()
            .single();
        if (guestError) {
            return new Response(JSON.stringify({ error: guestError.message }), { status: 400 });
        }
        guestUserId = guest.id;
    }

    // Insert order
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
            {
                user_id: authUserId,
                guest_user_id: guestUserId,
                delivery_address: order.deliveryAddress,
                shipping_address: order.shippingAddress,
                total_amount: order.totalAmount,
                status: 'Paid', // Set status to 'Paid'
                razorpay_payment_id: order.razorpayPaymentId,
            },
        ])
        .select()
        .single();

    if (orderError) {
        return new Response(JSON.stringify({ error: orderError.message }), { status: 400 });
    }

    // Batch insert order_items
    const orderItemsToInsert = items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.id, // Change to item.productId if needed
        quantity: item.quantity,
        price: item.price,
        unit_price: item.unit_price || Math.round(item.price / item.quantity) // Use unit_price from quotation or calculate from total
    }));
    const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);
    if (orderItemsError) {
        return new Response(JSON.stringify({ error: `Failed to insert order items: ${orderItemsError.message}` }), { status: 400 });
    }

    // Update product quantities using the stock management system
    for (const item of items) {
        const { error: updateError } = await supabase.rpc('update_product_stock', {
            p_product_id: item.id,
            p_quantity_change: -item.quantity, // Negative for purchase (decrease stock)
            p_transaction_type: 'purchase',
            p_order_id: newOrder.id,
            p_reason: 'Order placed',
            p_notes: `Stock decreased due to order placement - Order #${newOrder.id}`
        });
        if (updateError) {
            return new Response(JSON.stringify({ error: `Failed to update product quantity: ${updateError.message}` }), { status: 400 });
        }
    }

    // Send order confirmation email using SendGrid
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (sendgridApiKey && customer.email) {
        const emailBody = {
            personalizations: [
                { to: [{ email: customer.email, name: `${customer.firstName} ${customer.lastName}` }] }
            ],
            from: { email: "yourshop@example.com", name: "Kadiyam Nursery" },
            subject: `Order Confirmation - Order #${newOrder.id}`,
            content: [
                {
                    type: "text/plain",
                    value: `Thank you for your order!\n\nOrder ID: ${newOrder.id}\nEstimated Delivery: 5-7 days\n\nOrder Summary:\n${items.map(item => `- ${item.name} x${item.quantity} @ ₹${item.price}`).join('\n')}\n\nTotal: ₹${order.totalAmount}\n\nWe appreciate your business!`
                }
            ]
        };

        await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${sendgridApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(emailBody)
        });
    }

    return new Response(
        JSON.stringify({
            message: 'Order placed successfully',
            orderId: newOrder.id,
        }),
        { status: 200 }
    );
}); 