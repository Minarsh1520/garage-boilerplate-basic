'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { FullPageSpinner } from '@/components/shared/LoadingSpinner'

export default function SignUpPage() {
  const router = useRouter()

  const {
    user,
    profile,
    loading,
    signUpWithEmail,
    signInWithGoogle,
  } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [loading, user, profile, router])

  if (loading) {
    return <FullPageSpinner />
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch {
      toast.error('Google sign-in failed. Please try again.')
    }
  }

  const onSubmit = async (data: SignupInput) => {
    try {
      await signUpWithEmail(
        data.email,
        data.password,
        data.displayName
      )

      router.push('/auth/signin?verification=sent')
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('email-already-in-use')
      ) {
        toast.error('An account with this email already exists')
      } else {
        toast.error('Failed to create account. Please try again.')
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="w-full bg-[#4361AB] px-4 py-3 sm:px-6 md:px-8">
        <h1 className="text-lg font-bold text-white sm:text-xl md:text-2xl">
          Employee Onboarding
        </h1>
      </header>

      {/* Sign-up content */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#222222] sm:text-3xl">
              Create Account
            </h2>
          </div>

          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="
              flex w-full items-center justify-center gap-3
              rounded-md border border-zinc-300
              bg-zinc-200 px-4 py-2
              text-sm font-medium text-[#222222]
              shadow-sm transition-colors
              hover:bg-zinc-50
            "
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
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

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="w-full border-t border-zinc-300" />

            <span className="absolute left-1/2 -translate-x-1/2 bg-white px-2 text-sm text-zinc-500">
              or
            </span>
          </div>

          {/* Sign-up form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 rounded-xl border border-zinc-300 px-3 py-3"
          >
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="displayName"
                className="text-sm font-medium text-[#222222]"
              >
                Name
              </label>

              <input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                aria-invalid={!!errors.displayName}
                aria-describedby={
                  errors.displayName
                    ? 'display-name-error'
                    : undefined
                }
                {...register('displayName')}
                className="
                  w-full rounded-md border border-zinc-300
                  bg-white px-3 py-2.5 text-sm text-black
                  shadow-sm placeholder:text-zinc-400
                  focus:ring-2 focus:ring-zinc-500
                  focus:outline-none
                  aria-invalid:border-red-500
                "
              />

              {errors.displayName && (
                <p
                  id="display-name-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#222222]"
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter e-mail"
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? 'email-error' : undefined
                }
                {...register('email')}
                className="
                  w-full rounded-md border border-zinc-300
                  bg-white px-3 py-2.5 text-sm text-black
                  shadow-sm placeholder:text-zinc-400
                  focus:ring-2 focus:ring-zinc-500
                  focus:outline-none
                  aria-invalid:border-red-500
                "
              />

              {errors.email && (
                <p
                  id="email-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#222222]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter password..."
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password
                      ? 'password-error'
                      : undefined
                  }
                  {...register('password')}
                  className="
                    w-full rounded-md border border-zinc-300
                    bg-white py-2.5 pr-10 pl-3
                    text-sm text-black shadow-sm
                    placeholder:text-zinc-400
                    focus:ring-2 focus:ring-zinc-500
                    focus:outline-none
                    aria-invalid:border-red-500
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p
                  id="password-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-[#222222]"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword ? 'text' : 'password'
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter password..."
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword
                      ? 'confirm-password-error'
                      : undefined
                  }
                  {...register('confirmPassword')}
                  className="
                    w-full rounded-md border border-zinc-300
                    bg-white py-2.5 pr-10 pl-3
                    text-sm text-black shadow-sm
                    placeholder:text-zinc-400
                    focus:ring-2 focus:ring-zinc-500
                    focus:outline-none
                    aria-invalid:border-red-500
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Create account */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full rounded-md bg-[#4361AB]
                px-4 py-2.5 text-sm font-medium
                text-white transition-colors
                hover:bg-[#3B579A]
                active:bg-[#344E8C]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {isSubmitting
                ? 'Creating account…'
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 sm:text-sm">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="text-[#4361AB] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}