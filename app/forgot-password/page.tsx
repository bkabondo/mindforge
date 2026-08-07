'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Via /auth/callback so the PKCE code is exchanged server-side before
      // the reset form loads.
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-2xl">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm">MF</div>
            MindForge
          </Link>
        </div>
        <Card className="bg-slate-800/80 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription className="text-slate-400">We&apos;ll email you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <div className="text-5xl">📬</div>
                <p className="text-slate-300 text-sm">Check <strong className="text-white">{email}</strong> for a reset link.</p>
                <Link href="/login"><Button variant="outline" className="w-full border-slate-600 text-slate-200">Back to Sign In</Button></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <p className="text-center text-slate-400 text-sm">
                  Remember it? <Link href="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
