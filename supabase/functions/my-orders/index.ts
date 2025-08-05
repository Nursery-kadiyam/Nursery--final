import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const url = new URL(req.url);
    const userId = url.pathname.split('/').pop();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch orders for userId, join order_items and products
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
      id,
      created_at,
      status,
      delivery_address,
      order_items:order_items(
        id,
        quantity,
        price,
        product:products(
          id,
          name,
          image
        )
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Format response
    const result = (orders || []).map(order => ({
        id: order.id,
        date: order.created_at,
        status: order.status,
        address: order.delivery_address,
        items: (order.order_items || []).map(item => ({
            name: item.product?.name,
            image: item.product?.image,
            quantity: item.quantity,
            price: item.price
        }))
    }));

    return new Response(JSON.stringify(result), { status: 200 });
}); 