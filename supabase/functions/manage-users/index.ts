import { createClient } from 'npm:@supabase/supabase-js@2'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight request immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Edge function started successfully.");
    
    // 2. Initialize Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server misconfiguration: Missing Supabase URL or Service Key');
    }

    // 3. Extract and Validate the Auth Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '').trim();

    // 4. Create Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // 5. Verify User Session explicitly using the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
        throw new Error('Unauthorized Session: ' + (authError?.message || 'Invalid token'));
    }

    // 6. Verify Admin Privileges
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (profileErr) throw new Error('Failed to fetch user profile: ' + profileErr.message);
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
        throw new Error('Forbidden: Only admins can manage users');
    }

    // 7. Parse Payload Safely
    let action, payload;
    try {
        const body = await req.json();
        action = body.action;
        payload = body.payload;
    } catch (e) {
        throw new Error('Invalid JSON payload sent to server');
    }

    // ==========================================
    // ACTION: UPDATE USER
    // ==========================================
    if (action === 'updateUser') {
      console.log(`Updating user: ${payload.email}`);
      const { userId, email, password, name, role, dealership_id } = payload;
      
      // Step A: Update Auth User
      const authUpdates: any = { email: email };
      if (password && password.trim() !== '') {
          authUpdates.password = password;
      }
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (updateError) throw new Error('Auth Update Error: ' + updateError.message);

      // Step B: Update Public User
      const { error: dbUpdateError } = await supabaseAdmin.from('users').update({
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null
      }).eq('id', userId);
      
      if (dbUpdateError) {
        throw new Error('Database Update Error: ' + dbUpdateError.message);
      }

      return new Response(JSON.stringify({ success: true, user: updatedUser.user }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ==========================================
    // ACTION: CREATE USER
    // ==========================================
    if (action === 'createUser') {
      const { email, password, name, role, dealership_id } = payload;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email, password: password, email_confirm: true
      });
      if (createError) throw new Error('Auth Creation Error: ' + createError.message);
      
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: newUser.user.id, email: email, name: name, role: role, dealership_id: dealership_id || null
      });
      
      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error('Database Insertion Error: ' + insertError.message);
      }
      return new Response(JSON.stringify({ success: true, user: newUser.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ==========================================
    // ACTION: DELETE USER
    // ==========================================
    if (action === 'deleteUser') {
      const { userId } = payload;
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error('Auth Deletion Error: ' + deleteError.message);
      await supabaseAdmin.from('users').delete().eq('id', userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action requested' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Edge Function Error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Unknown server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})