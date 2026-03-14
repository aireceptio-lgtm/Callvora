import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Server misconfiguration: Missing Supabase URL or Service Key');
    }

    // Validate Auth Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Create Admin Client (Bypasses RLS - use only for Auth Admin API)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create User-Scoped Client (Inherits RLS and Triggers based on the admin's JWT)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify User Session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized Session: ' + (authError?.message || 'No user found'));

    // Verify Admin privileges using the user's own token
    const { data: callerProfile, error: profileErr } = await supabaseClient.from('users').select('role').eq('id', user.id).single();
    if (profileErr) throw new Error('Failed to fetch user profile: ' + profileErr.message);
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
        throw new Error('Forbidden: Only admins can manage users');
    }

    const { action, payload } = await req.json()

    // ==========================================
    // ACTION: CREATE USER
    // ==========================================
    if (action === 'createUser') {
      const { email, password, name, role, dealership_id } = payload;
      
      // Step A: Create Auth User (requires Admin privileges)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (createError) throw new Error('Auth Creation Error: ' + createError.message);
      if (!newUser || !newUser.user) throw new Error('Failed to create user in Auth layer.');

      // Step B: Insert Public User using supabaseClient so 'auth.uid()' is populated in Postgres triggers
      const { error: insertError } = await supabaseClient.from('users').insert({
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

    // ==========================================
    // ACTION: UPDATE USER
    // ==========================================
    if (action === 'updateUser') {
      const { userId, email, password, name, role, dealership_id } = payload;
      
      // Step A: Update Auth User
      const authUpdates: any = { email: email };
      if (password) {
          authUpdates.password = password;
      }
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (updateError) throw new Error('Auth Update Error: ' + updateError.message);

      // Step B: Update Public User using supabaseClient so triggers don't reject it
      const { error: dbUpdateError } = await supabaseClient.from('users').update({
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

    // ==========================================
    // ACTION: DELETE USER
    // ==========================================
    if (action === 'deleteUser') {
      const { userId } = payload;
      
      // Delete from Supabase Auth explicitly
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error('Auth Deletion Error: ' + deleteError.message);

      // Delete from public users explicitly 
      await supabaseClient.from('users').delete().eq('id', userId);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })

  } catch (err: any) {
    console.error('manage-users error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})