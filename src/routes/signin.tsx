import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { adminApi } from '@/api/endpoints';
import { ApiError, describe } from '@/api/errors';
import { getSession } from '@/api/session';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { PasswordInput } from '@/components/primitives/PasswordInput';
import { ErrorState } from '@/components/patterns/states';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/enums';
import { t } from '@/i18n/t';
import { canSignIn } from '@/lib/permissions';
import { env } from '@/lib/env';

/**
 * Sign-in. The only route outside the wall that does anything.
 *
 * The mock roster is printed below the form IN MOCK MODE ONLY. There is no
 * secret to protect — `rbs-backend` has no admin auth at all — and §11 step 2
 * asks a reviewer to sign in as each of the five roles, which they cannot do
 * without being told how.
 */

const SearchSchema = z.object({
  /**
   * Where to go after signing in.
   *
   * Validated to a same-origin PATH, and that validation is the security part:
   * an unchecked `redirect` parameter is an open redirect, and an open redirect
   * on a sign-in page is a credential-phishing primitive — `?redirect=https://
   * evil.example` sends an operator who just typed a password to somewhere that
   * looks like this console.
   */
  redirect: z
    .string()
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'redirect must be a same-origin path',
    })
    .optional()
    .catch(undefined),
});

const CredentialsSchema = z.object({
  email: z
    .string()
    .min(1, t('signin.emailRequired'))
    .pipe(z.email(t('signin.invalid'))),
  password: z.string().min(1, t('signin.passwordRequired')),
});

type Credentials = z.infer<typeof CredentialsSchema>;

export const Route = createFileRoute('/signin')({
  validateSearch: SearchSchema,

  // Already signed in? There is nothing here for them. Sending them on rather
  // than rendering a form they would have to dismiss.
  beforeLoad() {
    if (getSession() !== null) throw redirect({ to: '/insights' });
  },

  component: SignInScreen,
});

function SignInScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [failure, setFailure] = useState<unknown>(null);

  const form = useForm<Credentials>({
    resolver: zodResolver(CredentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);

    try {
      const session = await adminApi.auth.signIn(values.email, values.password);

      /*
       * A `player` account has valid credentials and no console capabilities.
       * Signing them in and then bouncing them off every screen would be
       * technically correct and useless; refusing here, with the reason, is the
       * version that tells them something.
       */
      if (!canSignIn(session.operator.role)) {
        await adminApi.auth.signOut();
        setFailure(
          new ApiError({
            failure: 'http',
            status: 403,
            code: 'FORBIDDEN',
            message: 'no console access',
          }),
        );
        return;
      }

      await navigate({ to: search.redirect ?? '/insights' });
    } catch (error) {
      setFailure(error);
    }
  });

  return (
    <main className="bg-canvas flex min-h-dvh items-center justify-center p-24" id="main">
      <div className="flex w-full max-w-md flex-col gap-24">
        <div className="flex flex-col gap-8">
          <p className="text-ink-tertiary text-xs font-medium tracking-[0.2em] uppercase">
            {t('app.product')}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
        </div>

        {failure === null ? null : (
          <ErrorState description={describe(failure)} title={t('signin.title')} />
        )}

        {search.redirect === undefined ? null : (
          <p className="text-ink-secondary text-sm">
            {t('signin.redirected', { destination: search.redirect })}
          </p>
        )}

        <form
          className="flex flex-col gap-16"
          noValidate
          onSubmit={(event) => void onSubmit(event)}
        >
          <Input
            autoComplete="username"
            label={t('signin.email')}
            type="email"
            {...form.register('email')}
            {...(form.formState.errors.email?.message === undefined
              ? {}
              : { error: form.formState.errors.email.message })}
          />

          <PasswordInput
            autoComplete="current-password"
            hideLabel={t('signin.hidePassword')}
            label={t('signin.password')}
            revealLabel={t('signin.showPassword')}
            {...form.register('password')}
            {...(form.formState.errors.password?.message === undefined
              ? {}
              : { error: form.formState.errors.password.message })}
          />

          {form.formState.isSubmitting ? (
            <Button
              busyLabel={t('signin.submitting')}
              loading={true}
              type="submit"
              variant="primary"
            >
              {t('signin.submit')}
            </Button>
          ) : (
            <Button type="submit" variant="primary">
              {t('signin.submit')}
            </Button>
          )}
        </form>

        {env.useMocks ? (
          <Suspense fallback={null}>
            <MockRoster />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}

/**
 * The five mock accounts, listed so a reviewer can actually use them.
 *
 * `lazy` over a dynamic import, so the fixture universe — every player,
 * restaurant, and service in the demo — lands in the mock chunk and NOT in the
 * sign-in route. A static import would put roughly a thousand generated rows
 * into the first screen a production build loads, to render five email
 * addresses that production never shows.
 *
 * No Suspense fallback: it is a hint below the form, and a spinner where a hint
 * will appear is more distracting than the hint arriving a frame late.
 */
const MockRoster = lazy(async () => {
  const { MOCK_OPERATORS, MOCK_PASSWORD } = await import('@/mocks/fixtures');

  return {
    default: function Roster() {
      return (
        <section className="border-rule bg-surface flex flex-col gap-8 rounded-md border p-16">
          <p className="text-ink text-sm font-medium">{t('signin.mockRoster')}</p>
          <p className="text-ink-secondary text-xs">
            {t('signin.mockRoster.detail', { password: MOCK_PASSWORD })}
          </p>

          <ul className="flex flex-col gap-4">
            {MOCK_OPERATORS.map((operator) => (
              <li className="flex flex-wrap items-baseline gap-8 text-xs" key={operator.id}>
                <code className="font-mono">{operator.email}</code>
                <span className="text-ink-secondary">{ROLE_LABELS[operator.role]}</span>
                <span className="text-ink-tertiary">{ROLE_DESCRIPTIONS[operator.role]}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    },
  };
});
