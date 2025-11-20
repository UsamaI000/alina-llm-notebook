import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    // 1. Parse request - Handle both camelCase and snake_case inputs just to be safe
    const reqBody = await req.json();
    const notebookId = reqBody.notebook_id || reqBody.notebookId;
    const { no_of_questions } = reqBody;
    console.log('Received quiz request for notebook:', notebookId);
    if (!notebookId) {
      throw new Error('Notebook ID is required');
    }
    // 2. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // 3. Get Env Variables
    const webhookUrl = Deno.env.get('QUIZ_GENERATION_WEBHOOK_URL');
    const authHeader = Deno.env.get('NOTEBOOK_GENERATION_AUTH');
    if (!webhookUrl) throw new Error('Missing QUIZ_GENERATION_WEBHOOK_URL');
    // ---------------------------------------------------------
    // NEW STEP: Create a "Generating" entry in the quizzes table
    // ---------------------------------------------------------
    const { data: newQuiz, error: insertError } = await supabase.from('quizzes').insert({
      notebook_id: notebookId,
      status: 'generating'
    }).select().single();
    if (insertError) {
      console.error("DB Insert Error:", insertError);
      throw insertError;
    }
    console.log('Created new quiz record:', newQuiz.id);
    // 4. Call n8n Webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      },
      body: JSON.stringify({
        notebook_id: notebookId,
        no_of_questions: no_of_questions || 5,
        timestamp: new Date().toISOString()
      })
    });
    if (!webhookResponse.ok) {
      throw new Error(`n8n error: ${webhookResponse.status}`);
    }
    // 5. Parse n8n Response
    const webhookData = await webhookResponse.json();
    // Handle different response formats (Array vs Object)
    let questions = [];
    let quizTitle = null;
    // Case 1: Standard Array Format [ { output: { ... } } ]
    if (Array.isArray(webhookData) && webhookData[0]?.output) {
      questions = webhookData[0].output.questions || [];
      quizTitle = webhookData[0].output.quiz_title || null;
    } else if (webhookData.data && Array.isArray(webhookData.data) && webhookData.data[0]?.output) {
      questions = webhookData.data[0].output.questions || [];
      quizTitle = webhookData.data[0].output.quiz_title || null;
    } else if (webhookData.questions) {
      questions = webhookData.questions;
      quizTitle = webhookData.quiz_title || null;
    } else {
      console.error("Unexpected n8n format:", JSON.stringify(webhookData));
      throw new Error("Could not find 'questions' in n8n response");
    }
    console.log(`Extracted ${questions.length} questions. Title: ${quizTitle}.Saving to Quiz ID: ${newQuiz.id}...`);
    // 6. Update the SPECIFIC Quiz Row (completed)
    const { error: updateError } = await supabase.from('quizzes').update({
      questions: questions,
      title: quizTitle,
      status: 'completed'
    }).eq('id', newQuiz.id); // Update ONLY the row we just created
    if (updateError) {
      console.error('DB Update Error:', updateError);
      throw updateError;
    }
    // 7. Return success
    return new Response(JSON.stringify({
      success: true,
      quizId: newQuiz.id,
      data: questions
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-quiz:', error);
    // If possible, try to mark the specific quiz as failed (if we have an ID)
    // Note: We can't easily access newQuiz.id here if it wasn't created yet, 
    // but we can try to update based on notebook_id if needed, or just leave it.
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
