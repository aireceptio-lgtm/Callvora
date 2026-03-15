import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')

    // Verify User Auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error(`Unauthorized request: ${authError?.message || 'Invalid user token'}`)

    const { data: userData } = await supabaseClient.from('users').select('role').eq('id', user.id).single()
    const isAdmin = userData?.role === 'ADMIN'

    const { action, dealershipId } = await req.json()

    // Create a service level client to bypass RLS for dealership updates if we are an admin or system
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'processRecharge') {
        if (!isAdmin) throw new Error('Only admins can process recharges')
        const isoDate = new Date().toISOString()
        const { error } = await supabaseAdmin.from('dealerships').update({
            cycle_start_date: isoDate,
            is_active: true,
            status: 'active'
        }).eq('id', dealershipId)

        if (error) throw error
        return new Response(JSON.stringify({ success: true, date: isoDate }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    else if (action === 'autoSuspendCheck') {
        // Any logged in user's UI can trigger this check, but the edge function will verify stats.
        // For simplicity, we just enforce the suspension logic.
        const { data: dealership } = await supabaseAdmin.from('dealerships').select('*').eq('id', dealershipId).single()
        if (dealership && dealership.minute_limit && dealership.is_active) {
            const start = new Date(dealership.cycle_start_date || dealership.created_at)
            const end = new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000))
            const now = new Date()
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            
            // fetch calls
            const { data: calls } = await supabaseAdmin.from('calls').select('duration, call_at').eq('dealership_id', dealershipId)
            let usedMin = 0
            if (calls) {
                const cycleCalls = calls.filter(c => new Date(c.call_at) >= start)
                const usedSec = cycleCalls.reduce((s, c) => s + (parseInt(c.duration) || 0), 0)
                usedMin = usedSec / 60
            }

            if (daysLeft <= 0 || usedMin >= dealership.minute_limit) {
                await supabaseAdmin.from('dealerships').update({is_active: false, status: 'suspended'}).eq('id', dealershipId)
                return new Response(JSON.stringify({ suspended: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        return new Response(JSON.stringify({ suspended: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Unknown action')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
