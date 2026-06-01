'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
    >
      Sign Out
    </Button>
  )
}
