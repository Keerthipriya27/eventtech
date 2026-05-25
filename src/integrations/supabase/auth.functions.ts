import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from './client.server'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['organizer', 'volunteer', 'sponsor', 'participant']),
})

export const serverSignUp = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof signUpSchema>) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: data.role },
    })

    if (error) {
      throw error
    }

    if (!created.user) {
      throw new Error('Unable to create user')
    }

    return { userId: created.user.id }
  })