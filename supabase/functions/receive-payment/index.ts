// Edge Function: receive-payment
// Recibe pagos desde la app de finanzas externa y los procesa automáticamente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface PaymentRequest {
  email: string
  fullName: string
  amount: number
  transactionId: string
  note?: string
  paymentDate?: string
}

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar API Key
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('FINANCE_APP_API_KEY')

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing API key' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. Parse request body
    const payload: PaymentRequest = await req.json()
    const { email, fullName, amount, transactionId, note, paymentDate } = payload

    // Validar campos requeridos
    if (!email || !fullName || !amount || !transactionId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required fields: email, fullName, amount, transactionId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Buscar usuario por email (case-insensitive)
    const { data: users, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, firstName, lastName, email')
      .ilike('email', email)

    if (userError) {
      console.error('Error fetching user:', userError)
      return new Response(
        JSON.stringify({ error: 'Database Error', message: userError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          message: `No user found with email: ${email}`,
          email
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. Match fuzzy por nombre completo
    const normalizedPaymentName = fullName.toLowerCase().trim()

    const matchedUser = users.find((u: UserProfile) => {
      const userFullName = `${u.firstName} ${u.lastName}`.toLowerCase()
      // Match bidireccional: permite "Juan Pérez" match con "Juan" o "Pérez" o "Juan Pérez"
      return userFullName.includes(normalizedPaymentName) ||
             normalizedPaymentName.includes(userFullName)
    })

    if (!matchedUser) {
      return new Response(
        JSON.stringify({
          error: 'User name mismatch',
          message: `Name "${fullName}" does not match user with email ${email}`,
          foundUsers: users.map((u: UserProfile) => `${u.firstName} ${u.lastName}`)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 6. Insertar pago (idempotencia via origen_id unique constraint)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('pagos')
      .insert({
        usuario_id: matchedUser.id,
        monto: amount,
        tipo: 'transferencia',
        fecha_pago: paymentDate || new Date().toISOString(),
        origen_id: transactionId,
        estado: 'procesado',
        nota: note || null
      })
      .select()
      .single()

    if (paymentError) {
      // Manejo especial para duplicados (código 23505 = unique violation)
      if (paymentError.code === '23505') {
        return new Response(
          JSON.stringify({
            status: 'already_processed',
            message: 'This payment was already recorded',
            transactionId
          }),
          {
            status: 200, // No es un error, es idempotente
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.error('Error inserting payment:', paymentError)
      return new Response(
        JSON.stringify({ error: 'Database Error', message: paymentError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 7. Crear notificación para el usuario
    try {
      await supabaseAdmin.rpc('create_notification_and_queue', {
        p_usuario_id: matchedUser.id,
        p_tipo: 'PAGO_RECIBIDO',
        p_titulo: 'Pago Recibido',
        p_mensaje: `Hemos recibido tu pago de $${amount.toLocaleString('es-UY')}. ¡Gracias!`,
        p_enlace: '/facturas'
      })
    } catch (notifError) {
      // No fallar el request si la notificación falla
      console.error('Error creating notification:', notifError)
    }

    // 8. Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          usuario_id: payment.usuario_id,
          monto: payment.monto,
          fecha_pago: payment.fecha_pago,
          estado: payment.estado
        },
        message: 'Payment processed successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
