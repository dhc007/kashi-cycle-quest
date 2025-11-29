import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PHONEPE_CLIENT_ID');
    const clientSecret = Deno.env.get('PHONEPE_CLIENT_SECRET');
    const clientVersion = Deno.env.get('PHONEPE_CLIENT_VERSION') || '1';
    const env = Deno.env.get('PHONEPE_ENV') || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error('PhonePe credentials not configured');
    }

    const { amount, currency, receipt, booking_id } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Determine API base URL based on environment
    const baseUrl = env === 'production' 
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Step 1: Get OAuth Access Token
    const authString = btoa(`${clientId}:${clientSecret}:${clientVersion}`);
    
    console.log('Getting PhonePe OAuth token...');
    
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token error:', JSON.stringify(tokenData));
      throw new Error(tokenData.message || 'Failed to get PhonePe access token');
    }

    const accessToken = tokenData.access_token;
    console.log('Got PhonePe access token');

    // Step 2: Create Payment Order
    const merchantOrderId = receipt || `order_${Date.now()}`;
    const amountInPaise = Math.round(amount * 100);

    // Get the app URL for redirect
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const appUrl = supabaseUrl.includes('supabase.co') 
      ? supabaseUrl.replace('.supabase.co', '.lovableproject.com').replace('https://', 'https://') 
      : 'https://lyhpskhheiamtskkbfes.lovableproject.com';
    
    const redirectUrl = `${appUrl}/payment-callback`;

    const orderPayload = {
      merchantOrderId,
      amount: amountInPaise,
      expireAfter: 1200, // 20 minutes
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: 'Payment for Bolt91 Cycle Rental',
        merchantUrls: {
          redirectUrl: `${redirectUrl}?merchantOrderId=${merchantOrderId}`,
        },
      },
    };

    console.log('Creating PhonePe order with payload:', JSON.stringify(orderPayload));

    const orderResponse = await fetch(`${baseUrl}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();
    
    console.log('PhonePe order response:', JSON.stringify(orderData));

    if (!orderResponse.ok) {
      console.error('Order creation error:', JSON.stringify(orderData));
      throw new Error(orderData.message || 'Failed to create PhonePe order');
    }

    // Extract redirect URL from response
    const redirectUrlFromResponse = orderData.redirectUrl || orderData.data?.redirectUrl;
    
    if (!redirectUrlFromResponse) {
      console.error('No redirect URL in response:', JSON.stringify(orderData));
      throw new Error('No redirect URL received from PhonePe');
    }

    return new Response(
      JSON.stringify({
        success: true,
        merchantOrderId,
        redirectUrl: redirectUrlFromResponse,
        orderId: orderData.orderId || merchantOrderId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-phonepe-order:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});