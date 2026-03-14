import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing server configuration.");

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the calling user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");
    const token = authHeader.replace("Bearer ", "").trim();

    // To validate a user token, we MUST create a temporary standard client using the ANON key + user token.
    // The Service Role admin client cannot reliably validate standard user sessions.
    const supabaseAnonUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseAnonUrl || !supabaseAnonKey) throw new Error("Missing ANON server configuration.");

    const supabaseUserClient = createClient(supabaseAnonUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error(`Invalid Session Token: ${authError?.message || 'No user found'}`);

    // Verify caller is ADMIN (by email to avoid ID mismatch issues) using the Admin client
    const { data: adminCheck, error: adminErr } = await supabaseAdmin
      .from("users").select("role").eq("email", user.email).single();
    if (adminErr || !adminCheck || adminCheck.role !== "ADMIN") {
      throw new Error("Forbidden: Only Admins can perform this action.");
    }

    const { action, payload } = await req.json();

    // ==========================================
    // ACTION: CREATE USER
    // ==========================================
    if (action === "createUser") {
      const { email, password, name, role, dealership_id } = payload;

      // Step A: Create in Supabase Auth
      const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (authCreateErr) throw new Error("Auth creation failed: " + authCreateErr.message);

      // Step B: Insert in public.users via SECURITY DEFINER RPC (bypasses all RLS)
      const { error: rpcErr } = await supabaseAdmin.rpc("admin_insert_user", {
        p_id: authData.user.id,
        p_email: email,
        p_name: name,
        p_role: role,
        p_dealership_id: dealership_id || null,
      });
      if (rpcErr) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id); // Rollback
        throw new Error("DB insert failed: " + rpcErr.message);
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ACTION: UPDATE USER
    // ==========================================
    if (action === "updateUser") {
      const { userId, email, password, name, role, dealership_id } = payload;

      // Update password in Auth (if provided)
      if (password && password.trim() !== "") {
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      }

      // Update profile via SECURITY DEFINER RPC (bypasses all RLS)
      const { error: rpcErr } = await supabaseAdmin.rpc("admin_update_user", {
        p_user_id: userId,
        p_email: email,
        p_name: name,
        p_role: role,
        p_dealership_id: dealership_id || null,
      });
      if (rpcErr) throw new Error("DB update failed: " + rpcErr.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ACTION: DELETE USER
    // ==========================================
    if (action === "deleteUser") {
      const { userId } = payload;

      // Delete from Auth
      await supabaseAdmin.auth.admin.deleteUser(userId);

      // Delete from public.users via SECURITY DEFINER RPC (bypasses all RLS)
      const { error: rpcErr } = await supabaseAdmin.rpc("admin_delete_user", {
        p_user_id: userId,
      });
      if (rpcErr) throw new Error("DB delete failed: " + rpcErr.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action: " + action);

  } catch (error: any) {
    console.error("manage-users error:", error);
    // Return the exact raw error to the frontend so we can debug it
    const errDetails = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
    return new Response(JSON.stringify({ error: errDetails }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});