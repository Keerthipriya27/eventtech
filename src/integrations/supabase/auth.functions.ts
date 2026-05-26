import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from './client.server'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

const signUpSchema = z.object({
  email: z.string().email().refine((e) => e.endsWith('@gmail.com'), { message: 'Email must be a @gmail.com address' }),
  password: z.string().min(10).regex(passwordRegex, { message: 'Password must be at least 10 characters and include upper, lower, number, and special char' }),
  fullName: z.string().min(2),
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