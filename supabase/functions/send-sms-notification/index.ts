import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED: SMS notifications after booking confirmation
  // This function is now only used for OTP verification
  console.log('SMS notification disabled - only OTP active');

  return new Response(
    JSON.stringify({ 
      success: true, 
      note: 'SMS notifications are disabled except for OTP'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
