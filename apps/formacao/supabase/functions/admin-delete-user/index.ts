import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify they're an admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { db: { schema: "formacao" },
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the calling user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      console.error('Claims error:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callingUserId = claimsData.claims.sub

    // Create admin client to check if user is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: "formacao" } })

    // Check if calling user is an admin
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callingUserId)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('Profile error or not admin:', profileError, profile)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the email to delete from request body
    const { email } = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${callingUserId} attempting to delete user with email: ${email}`)

    // Find the user by email using admin client
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to list users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userToDelete = users.users.find(u => u.email === email)
    
    if (!userToDelete) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found user to delete: ${userToDelete.id}`)

    // Delete related data first (enrollments, lesson_progress, profile)
    const { error: enrollmentsError } = await adminClient
      .from('enrollments')
      .delete()
      .eq('user_id', userToDelete.id)
    
    if (enrollmentsError) {
      console.error('Error deleting enrollments:', enrollmentsError)
    }

    const { error: progressError } = await adminClient
      .from('lesson_progress')
      .delete()
      .eq('user_id', userToDelete.id)
    
    if (progressError) {
      console.error('Error deleting lesson progress:', progressError)
    }

    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userToDelete.id)
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
    }

    // Delete the user from auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userToDelete.id)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from authentication' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully deleted user: ${email}`)

    return new Response(
      JSON.stringify({ success: true, message: `User ${email} deleted successfully` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
