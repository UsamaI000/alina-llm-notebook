import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Quiz callback received:', body)
    
    const { notebook_id, quiz_data, status, error } = body
    
    if (!notebook_id) throw new Error('Notebook ID is required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (status === 'success' && quiz_data) {
      // Success: Save questions and mark completed
      const { error: updateError } = await supabase
        .from('notebooks')
        .update({
          quiz_data: quiz_data,
          quiz_generation_status: 'completed'
        })
        .eq('id', notebook_id)

      if (updateError) throw updateError
      console.log('Quiz saved successfully for:', notebook_id)

    } else {
      // Failure
      const { error: updateError } = await supabase
        .from('notebooks')
        .update({ quiz_generation_status: 'failed' })
        .eq('id', notebook_id)

      if (updateError) throw updateError
      console.log('Quiz generation failed for:', notebook_id, error)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in quiz-generation-callback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})