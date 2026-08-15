'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { FullPageSpinner } from '@/components/shared/LoadingSpinner'

export default function SignInPage() {
  const router = useRouter()
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!loading && user) {
      router.replace('/team') // Redirect to the team page if the user is already signed in
    }
  }, [loading, user, router])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verification') === 'sent') {
      toast.success('Verification email sent. Verify your email, then sign in.')
    }
  }, [])

  if (loading) return <FullPageSpinner />

  const onSubmit = async (data: LoginInput) => {
    try {
      await signInWithEmail(data.email, data.password)
      toast.success('Signed in successfully')
      router.replace('/team')
      router.refresh()
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('email-not-verified')) {
        toast.error('Please verify your email before signing in.')
      } else {
        toast.error('Invalid email or password')
      }
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      router.replace('/team')
    } catch {
      toast.error('Google sign-in failed. Please try again.')
    }
  }

  //This is the original code that was commented out, it serve as good reference.
  /*return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1> 
        <p className="text-sm text-zinc-500">Enter your credentials to continue</p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 px-2 text-zinc-400 dark:bg-zinc-950">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-red-500" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-red-500" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-zinc-900 hover:underline dark:text-white"
        >
          Create one
        </Link>
      </p>
    </div>
  )*/
  return (
    //Use min height to deal with different screen sizes
    // Also massive repsect for web dev who making cool styling, honestly this is tedious as hell to do
    // As a new web dev, it was not worth 4 hours bug fixing every inconsistent spacing, typos. and interactive elements
    // Good thing somepart of this can be automate base on existing format and style, but still need to do some manual adjustment
    /*Bug fix comment will be type here:
    - sm:px-6 and not sm: px-6, these typos where small but break tailwind, and it's hard to realize have it not obvious spacing issue
    - Since we transition from dark mode to light mode, we need to change the text color to black, and background to white
    */
    /*Personal note will be added here:
    -Scaling feature with max width make thing much easier, though if the design specification say other wise then cooked.
    - Since the laptop scree is bigger and we don't want feature to scale too much, use max-w-md to limit it to 448 px
   */
    <div className = "flex min-h-screen flex-col bg-white">
      {/*Project Header*/}
      <header className = "w-full bg-brand-red px-4 py-3 sm:px-6 md:px-8">
        <h1 className = "text-lg font-normal text-white sm:text-xl md:text-2xl">
          Project 29 Garage - AI Assistant for HR
        </h1>
      </header>
      {/* Login Page Content*/}
      <main className = "flex flex-1 items-center justify-center px-4 py-10">
        <div className = "w-full max-w-md space-y-6"> {/*Max width with limit to 448 px as per design*/}

          {/*Page heading*/}
          <div className = "text-center">
            <h2 className = "text-2xl text-black font-bold tracking-tight sm:text-3xl">
              Sign In
            </h2>
          </div>

          {/*Google sign in*/}
          <button
            type = "button"
            onClick = {handleGoogleSignIn}
            className ="
              flex w-full items-center justify-center gap-3
              rounded-md border border-zinc-300
              bg-white px-4 py-3
              text-black
              text-sm font-medium shadow-sm transition-colors
              hover:bg-zinc-50"
          >
            <svg
              className = "size-4"
              viewBox = "0 0 24 24"
              aria-hidden = "true"
            >
            {/*Use existing SVG paths for Google*/}
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            </svg>
            Continue with Google
          </button>

          {/*The --or-- divider*/}
          <div className = "relative flex items-center">
            <div className = "w-full border-t border-zinc-300" />

            <span className = "absolute left-1/2 -translate-x-1/2 bg-white px-2 text-sm text-black text-zinc-500">
              or
            </span>
          </div>

          {/*Email & Password Form*/}
          <form
            onSubmit = {handleSubmit(onSubmit)}
            className = "space-y-4"
          >
            {/*Email input field*/}
            <div className = "flex flex-col gap-1.5">
              <label
                htmlFor = "email"
                className = "text-sm text-black font-medium"
              >
                E-mail
              </label>
              <input
              id = "email"
              type = "email"
              autoComplete = "email"
              aria-invalid = {!!errors.email}
              aria-describedby = {errors.email ? 'email-error' : undefined}
              placeholder="Enter e-mail"
              {...register('email')}
              className ="
                w-full rounded-md border border-zinc-300
                bg-white px-3 py-2.5 text-sm shadow-sm
                placeholder:text-zinc-400 text-black focus:ring-2 focus:ring-zinc-500
                focus:outline-none aria-invalid:border-red-500
                "
              />

              {errors.email && (
                <p
                  id = "email-error"
                  className = "text-xs text-red-500"
                  role = "alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/*Password input field*/}
            <div className = "flex flex-col gap-1.5">
              <label
                htmlFor = "password"
                className = "text-sm text-black font-medium"
              >
                Password
              </label>
              <input
                id = "password"
                type = "password"
                autoComplete = "current-password"
                aria-invalid = {!!errors.password}
                aria-describedby = {errors.password ? 'password-error' : undefined}
                placeholder = "Enter password..."
                {...register('password')}
                className ="
                  w-full rounded-md border border-zinc-300
                  bg-white px-3 py-2.5 text-sm shadow-sm
                  placeholder:text-zinc-400 text-black focus:ring-2 focus:ring-zinc-500
                  focus:outline-none aria-invalid:border-red-500"
              />
              {errors.password && (
                <p
                  id = "password-error"
                  className = "text-xs text-red-500"
                  role = "alert"
                >
                  {errors.password.message}
                </p>
              )}
              <div className = "flex justify-end">
                <Link
                  href = "/auth/forgot-password"
                  className = "text-xs text-brand-red hover:underline sm:text-sm"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            
            {/*Submit button*/}
            <button
              type = "submit"
              disabled = {isSubmitting}
              className ="
                w-full rounded-md bg-brand-red px-4 py-2.5 text-sm
                font-medium text-white transition-colors
                hover:bg-brand-red-light active:bg-brand-red-dark
                disabled:cursor-not-allowed disabled:opacity-50
                "
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
            {/*Sign up link*/}
            <p className = "text-center text-xs text-zinc-500 sm:text-sm">
              Don&apos;t have an account?{' '} {/* "'" = "&apos;", a bit weird but understandable*/}
              <Link
                href = "/auth/signup"
                className = "text-brand-red hover:underline"
              >
                Create one
              </Link>
            </p>
        </div>
      </main>
    </div>
  )
}