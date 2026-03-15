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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')

    // 1. Verify User Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // Get the user object implicitly using the client's Authorization header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error(`Unauthorized request: ${authError?.message || 'Invalid user token'}`)

    // Get user's role to check if they are ADMIN
    const { data: userData } = await supabaseClient.from('users').select('role').eq('id', user.id).single()
    const isAdmin = userData?.role === 'ADMIN'

    // 2. Parse payload
    const body = await req.json()
    const { contents } = body

    // 3. Define Gemini Tools
    const fetchTool = {
      name: "fetch_records",
      description: "Fetch records from the database. Allowed tables: vehicles, leads, dealerships, calls, users.",
      parameters: {
        type: "OBJECT",
        properties: {
          table: { type: "STRING", description: "The table name" },
          select: { type: "STRING", description: "Columns to select, e.g., '*' or 'id, name'" },
          eq_column: { type: "STRING", description: "Column to filter by exact match (optional)" },
          eq_value: { type: "STRING", description: "Value to filter by exact match (optional)" }
        },
        required: ["table"]
      }
    };

    const mutationTools = [
      {
        name: "add_record",
        description: "Insert a new record into the database. Allowed tables: vehicles, leads, dealerships.",
        parameters: {
          type: "OBJECT",
          properties: { 
              table: { type: "STRING", description: "The table name (vehicles, leads, dealerships)" }, 
              payload: { type: "STRING", description: "A JSON string representation of the data to insert" } 
          },
          required: ["table", "payload"]
        }
      },
      {
        name: "update_record",
        description: "Update an existing record in the database. Allowed tables: vehicles, leads, dealerships.",
        parameters: {
          type: "OBJECT",
          properties: { 
              table: { type: "STRING", description: "The table name" }, 
              id: { type: "STRING", description: "The UUID of the record being updated" }, 
              payload: { type: "STRING", description: "A JSON string representation of the data fields to update" } 
          },
          required: ["table", "id", "payload"]
        }
      },
      {
        name: "delete_record",
        description: "Delete a record from the database. Allowed tables: vehicles, leads, dealerships.",
        parameters: {
          type: "OBJECT",
          properties: { 
              table: { type: "STRING", description: "The table name" }, 
              id: { type: "STRING", description: "The UUID of the record being deleted" } 
          },
          required: ["table", "id"]
        }
      }
    ];

    const tools = [{
        functionDeclarations: isAdmin ? [fetchTool, ...mutationTools] : [fetchTool]
    }];

    const systemPrompt = `You are CallVora AI, an intelligent assistant for a car dealership SaaS platform. You have full access to the platform database. 
You are also a highly knowledgeable general AI. You can chat casually and answer general knowledge questions (like science, geography, history, or anything else).
If the user asks about something outside the CRM (like "Nilambur" or any other topic), PLEASE answer using your vast general knowledge. Don't say you don't know it!
All financial values, prices, and costs are in Indian Rupees (INR, ₹).
Format responses clearly using markdown bullet points and bold text where appropriate. Be concise unless detail is needed.

Developer Info: If (and only if) you are specifically asked about who made this CRM, who the developer is, or if you know "Abhinand", respond that the developer is "Abhinand A R" and that he is from "Nilambur, Malappuram". Be friendly about it. Do not volunteer this information otherwise.

IMPORTANT DATABASE RULES:
You have tools to fetch, add, update, and delete records in the CRM.
Use the 'fetch_records' tool whenever a user asks a question about the CRM data (e.g., "how many vehicles", "what are the leads"). 
Whenever a user asks you to modify or add data, you MUST FIRST politely ask them "Are you sure you want me to [describe the exact action]?" 
DO NOT execute the tool until they explicitly confirm (e.g., reply "Yes"). If they confirm, execute the tool.

NEW BEHAVIOR FOR GENERAL KNOWLEDGE: If the user asks about a specific topic, location (like "Nilambur"), or entity not related to the CRM, first provide a simple, brief explanation. Your response MUST end with the question: "Do you want to know more?". If the user replies "yes" or asks for more details, then provide a large, detailed explanation.`;

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY secret not found in Supabase environment variables')

    const baseGeminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;

    async function callGemini(ctxContents: any[]) {
         const resp = await fetch(baseGeminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 system_instruction: { parts: [{ text: systemPrompt }] },
                 contents: ctxContents,
                 tools: tools,
                 generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
            }),
         });
         if (!resp.ok) throw new Error(`Gemini API Error: ${await resp.text()}`);
         return await resp.json();
    }

    // Call Gemini for the first time
    let geminiResponse = await callGemini(contents);

    // 4. Handle Function Calling Interception
    const firstCandidate = geminiResponse.candidates?.[0];
    const functionCall = firstCandidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (functionCall) {
        // We intercepted a function call! Let's execute it securely.
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const fnName = functionCall.name;
        const args = functionCall.args;
        let fnResult: any = { error: "Unknown function" };

        try {
            const table = args.table;
            const validTables = ['vehicles', 'leads', 'dealerships', 'calls', 'users'];
            if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

            if (fnName === "fetch_records") {
                let query = supabaseAdmin.from(table).select(args.select || '*').limit(50);
                if (args.eq_column && args.eq_value) {
                    query = query.eq(args.eq_column, args.eq_value);
                }
                const { error, data } = await query;
                if (error) throw error;
                fnResult = { success: true, action: "fetched", data: data };
            }
            else if (isAdmin) {
                // Mutation tools require ADMIN
                if (fnName === "add_record") {
                    const payload = JSON.parse(args.payload);
                    const { error, data } = await supabaseAdmin.from(table).insert([payload]).select();
                    if (error) throw error;
                    fnResult = { success: true, action: "inserted", data: data };
                } 
                else if (fnName === "update_record") {
                    const payload = JSON.parse(args.payload);
                    const { error, data } = await supabaseAdmin.from(table).update(payload).eq('id', args.id).select();
                    if (error) throw error;
                    fnResult = { success: true, action: "updated", data: data };
                }
                else if (fnName === "delete_record") {
                    const { error } = await supabaseAdmin.from(table).delete().eq('id', args.id);
                    if (error) throw error;
                    fnResult = { success: true, action: "deleted" };
                }
            } else {
                throw new Error("Unauthorized to use this tool");
            }
        } catch (e: any) {
            fnResult = { success: false, error: e.message };
        }

        // Send the function execution result back to Gemini so it can generate a human-readable confirmation
        contents.push(firstCandidate.content); // Append model's tool call request
        contents.push({
            role: "user", // The docs require tool responses to come from user/model context formats
            parts: [{
                functionResponse: {
                    name: fnName,
                    response: fnResult
                }
            }]
        });

        geminiResponse = await callGemini(contents);
        
        // Inject a custom flag so the frontend knows a database mutation succeeded
        if (fnResult.success) {
             geminiResponse._didMutate = true;
        }
    }

    return new Response(JSON.stringify(geminiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
