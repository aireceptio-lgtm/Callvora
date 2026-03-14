import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Server Configuration (URL or Key).");
    }

    // 2. The Service Role client acts as the ultimate system Admin, bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Parse Request Payload
    const body = await req.json();
    const { action, payload } = body;

    // 4. Securely Verify the user requesting the action is actually an Admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");
    const token = authHeader.replace("Bearer ", "").trim();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid or Expired Auth Token.");

    const { data: adminData, error: adminErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("email", user.email)
      .single();

    if (adminErr || !adminData || adminData.role !== "ADMIN") {
      throw new Error("Forbidden: Only Admins can execute this action.");
    }

    // ==========================================
    // ACTION: CREATE USER
    // ==========================================
    if (action === "createUser") {
      const { email, password, name, role, dealership_id } = payload;
      
      const { data: authData, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });
      if (authCreateErr) throw new Error("Auth Creation Failed: " + authCreateErr.message);

      const { error: dbInsertErr } = await supabaseAdmin.from("users").insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null,
      });

      if (dbInsertErr) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id); // Rollback if DB fails
        throw new Error("Database Insertion Failed: " + dbInsertErr.message);
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==========================================
    // ACTION: UPDATE USER
    // ==========================================
    if (action === "updateUser") {
      const { userId, email, password, name, role, dealership_id } = payload;

      // Update Auth Password (only if a new one was typed in)
      if (password && password.trim() !== "") {
        const { error: passErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: password });
        if (passErr) console.warn("Password sync warning:", passErr.message);
      }

      // Update Public DB
      const { error: dbUpdateErr } = await supabaseAdmin.from("users").update({
        email: email,
        name: name,
        role: role,
        dealership_id: dealership_id || null,
      }).eq("id", userId);

      if (dbUpdateErr) throw new Error("Database Update Failed: " + dbUpdateErr.message);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==========================================
    // ACTION: DELETE USER
    // ==========================================
    if (action === "deleteUser") {
      const { userId } = payload;
      
      await supabaseAdmin.auth.admin.deleteUser(userId); // Delete from Auth layer
      
      const { error: dbDelErr } = await supabaseAdmin.from("users").delete().eq("id", userId);
      if (dbDelErr) throw new Error("Database Delete Failed: " + dbDelErr.message);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown action requested.");

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});