import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate SHA256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1';
    const env = Deno.env.get('PHONEPE_ENV') || 'sandbox';

    if (!merchantId || !saltKey) {
      throw new Error('PhonePe credentials not configured');
    }

    const { amount, receipt, booking_id, user_id } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Determine API base URL based on environment
    const baseUrl = env === 'production' 
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Generate unique transaction ID
    const merchantTransactionId = receipt || `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const merchantUserId = user_id || `USER_${Date.now()}`;

    // Amount in paise
    const amountInPaise = Math.round(amount * 100);

    // Get the app URL for redirect
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const appUrl = supabaseUrl.includes('supabase.co') 
      ? supabaseUrl.replace('.supabase.co', '.lovableproject.com').replace('https://', 'https://') 
      : 'https://lyhpskhheiamtskkbfes.lovableproject.com';
    
    const redirectUrl = `${appUrl}/payment-callback?merchantTransactionId=${merchantTransactionId}`;
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/phonepe-callback`;

    // Create payload
    const payload = {
      merchantId,
      merchantTransactionId,
      merchantUserId,
      amount: amountInPaise,
      redirectUrl,
      redirectMode: 'POST',
      callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    console.log('Creating PhonePe order with payload:', JSON.stringify({
      ...payload,
      merchantId: '***HIDDEN***',
    }));

    // Base64 encode the payload
    const payloadBase64 = btoa(JSON.stringify(payload));

    // Generate X-VERIFY checksum
    const stringToHash = payloadBase64 + '/pg/v1/pay' + saltKey;
    const sha256Hash = await sha256(stringToHash);
    const xVerify = sha256Hash + '###' + saltIndex;

    console.log('Making request to PhonePe API...');

    // Make API request
    const response = await fetch(`${baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const responseData = await response.json();
    
    console.log('PhonePe API response:', JSON.stringify(responseData));

    if (!response.ok || !responseData.success) {
      console.error('PhonePe order creation failed:', JSON.stringify(responseData));
      throw new Error(responseData.message || responseData.data?.message || 'Failed to create PhonePe order');
    }

    // Extract redirect URL from response
    const paymentUrl = responseData.data?.instrumentResponse?.redirectInfo?.url;
    
    if (!paymentUrl) {
      console.error('No payment URL in response:', JSON.stringify(responseData));
      throw new Error('No payment URL received from PhonePe');
    }

    console.log('PhonePe order created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        merchantTransactionId,
        redirectUrl: paymentUrl,
        orderId: merchantTransactionId,
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
