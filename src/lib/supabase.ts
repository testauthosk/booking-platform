// DEPRECATED: This file is kept for backwards compatibility
// All new code should use Prisma directly via @/lib/prisma

// Stub exports to prevent build errors during migration
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use NextAuth') }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null } }),
    signUp: async () => ({ data: null, error: new Error('Use API') }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
    delete: () => ({ eq: async () => ({ error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: new Error('Use API for uploads') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ error: null }),
    })
  }
}

export const createServerClient = () => supabase
