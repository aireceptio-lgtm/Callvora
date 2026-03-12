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
    // Step 1: Init Env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Server misconfiguration: Missing Supabase URL or Service Key');
    }

    // Step 2: Validate Auth Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Step 3: Create Clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Step 4: Verify User Session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized Session: ' + (authError?.message || 'No user found'));

    // Step 5: Verify Admin privileges
    const { data: callerProfile, error: profileErr } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (profileErr) throw new Error('Failed to fetch user profile: ' + profileErr.message);
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
        throw new Error('Forbidden: Only admins can manage users');
    }

    // Step 6: Parse Payload
    const { action, payload } = await req.json()

    if (action === 'createUser') {
      const { email, password, name, role, dealership_id } = payload;
      
      // Step 7: Create Auth User
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (createError) throw new Error('Auth Creation Error: ' + createError.message);
      if (!newUser || !newUser.user) throw new Error('Failed to create user in Auth layer.');

      // Step 8: Insert Public User
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: newUser.user.id,
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null
      });
      
      if (insertError) {
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error('Database Insertion Error: ' + insertError.message);
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'updateUser') {
      const { userId, email, password, name, role, dealership_id } = payload;
      
      // Step 7: Update Auth User
      const authUpdates: any = { email: email };
      if (password) {
          authUpdates.password = password;
      }
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (updateError) throw new Error('Auth Update Error: ' + updateError.message);

      // Step 8: Update Public User
      const { error: dbUpdateError } = await supabaseAdmin.from('users').update({
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null
      }).eq('id', userId);
      
      if (dbUpdateError) {
        throw new Error('Database Update Error: ' + dbUpdateError.message);
      }

      return new Response(JSON.stringify({ success: true, user: updatedUser.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
    console.error('manage-users error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
