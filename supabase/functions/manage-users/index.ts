import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Create a Supabase client with the service role key to manage admin actions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and check if caller is an ADMIN
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    
    // Create a regular client with the incoming auth header for validation rather than service role
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Get the caller's profile to verify they are an ADMIN using the admin client to bypass RLS
    const { data: callerProfile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
        throw new Error('Forbidden: Only admins can manage users');
    }

    const { action, payload } = await req.json()

    if (action === 'createUser') {
      const { email, password, name, role, dealership_id } = payload;
      
      // 1. Create the user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (createError) throw createError;

      if (!newUser || !newUser.user) {
         throw new Error('Failed to create user in Auth');
      }

      // 2. Insert into public users table
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: newUser.user.id,
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null
      });
      
      // If insertion fails, rollback the auth user
      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw insertError;
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'deleteUser') {
      const { userId } = payload;
      
      // 1. Delete from Supabase Auth (this cascades to public.users if there's a cascade rule, but we explicitly delete from both just in case)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      // 2. Also delete from public users explicitly 
      await supabaseAdmin.from('users').delete().eq('id', userId);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
