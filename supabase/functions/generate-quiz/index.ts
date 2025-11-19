import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // 1. Parse the incoming request body
    // FIX: Changed notebookId -> notebook_id to match the frontend request
    const { notebookId, no_of_questions } = await req.json();
    console.log('Received quiz generation request:', {
      notebookId,
      no_of_questions
    });
    // 2. Get environment variables
    const webhookUrl = Deno.env.get('QUIZ_GENERATION_WEBHOOK_URL');
    const authHeader = Deno.env.get('NOTEBOOK_GENERATION_AUTH');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!webhookUrl) {
      throw new Error('QUIZ_GENERATION_WEBHOOK_URL environment variable not set');
    }
    // 3. Construct the payload matching your n8n workflow expectations
    const payload = {
      notebook_id: notebookId,
      no_of_questions: no_of_questions || 5,
      callback_url: `${supabaseUrl}/functions/v1/quiz-generation-callback`
    };
    console.log('Sending payload to n8n:', JSON.stringify(payload));
    // 4. Send request to n8n webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Ensure this header matches your n8n Webhook Auth settings
        // If n8n Auth is "None", this header is ignored but harmless
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });
    if (!webhookResponse.ok) {
      console.error(`Webhook responded with status: ${webhookResponse.status}`);
      const errorText = await webhookResponse.text();
      console.error('Webhook error response:', errorText);
      throw new Error(`Webhook responded with status: ${webhookResponse.status}`);
    }
    const webhookData = await webhookResponse.json();
    console.log('Webhook response:', webhookData);
    // 5. Return success response to frontend
    return new Response(JSON.stringify({
      success: true,
      data: webhookData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-quiz:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to generate quiz'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
