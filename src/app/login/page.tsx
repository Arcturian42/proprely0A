'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Mode = 'login' | 'register'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', companyName: '' })

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
    // No need to set loading false on success — page redirects
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { company_name: form.companyName },
          },
        })
        if (error) throw error
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.')
        setMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Proprely Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Tableau de bord entreprise de nettoyage</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Accédez à votre tableau de bord'
                : 'Créez votre espace entreprise'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <GoogleIcon />}
              Continuer avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">ou</span>
              </div>
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Nom de l'entreprise</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Proprely Nettoyage Pro"
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
              </Button>
            </form>

            <div className="text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
