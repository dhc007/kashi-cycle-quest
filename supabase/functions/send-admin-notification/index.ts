import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED: Admin SMS notifications after booking confirmation
  console.log('Admin SMS notification disabled');

  return new Response(
    JSON.stringify({ 
      success: true, 
      note: 'Admin SMS notifications are disabled'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
