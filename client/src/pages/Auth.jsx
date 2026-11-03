import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks';
import { homeFor } from '../components/ProtectedRoute';
import { Button, Field, Notice } from '../components/ui';
import s from './Auth.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks mirror the server's Zod rules so most mistakes show before submit. */
export function validateAuth(values, mode) {
  const e = {};
  if (mode === 'register' && values.name.trim().length < 2) e.name = 'Enter your full name';
  if (!EMAIL.test(values.email.trim())) e.email = 'Enter a valid email address';
  if (mode === 'register') {
    if (values.password.length < 8) e.password = 'Use at least 8 characters';
    else if (!/[a-zA-Z]/.test(values.password) || !/\d/.test(values.password))
      e.password = 'Use at least one letter and one number';
  } else if (!values.password) {
    e.password = 'Enter your password';
  }
  return e;
}

function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: params.get('role') === 'recruiter' ? 'recruiter' : 'seeker',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = (k) => (e) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched) setErrors(validateAuth(next, mode));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const found = validateAuth(values, mode);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError('');
    try {
      const me =
        mode === 'login'
          ? await login({ email: values.email, password: values.password })
          : await register(values);
      const role = me?.role || values.role;
      const dest =
        location.state?.from ||
        (mode === 'register' && role === 'recruiter' ? '/recruiter/company' : null);
      navigate(dest || homeFor(role), { replace: true });
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';
  return (
    <div className={s.wrap}>
      <form className={s.card} onSubmit={submit} noValidate>
        <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
        <p className={s.lede}>
          {isLogin ? 'Pick up where you left off.' : 'Free for job seekers and recruiters.'}
        </p>

        {!isLogin && (
          <fieldset className={s.roles}>
            <legend>I want to</legend>
            {[
              ['seeker', 'Find a job', 'Search, apply and track status'],
              ['recruiter', 'Hire people', 'Post jobs and run a pipeline'],
            ].map(([value, title, sub]) => (
              <label key={value} className={`${s.role} ${values.role === value ? s.roleOn : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={values.role === value}
                  onChange={set('role')}
                />
                <span className={s.roleTitle}>{title}</span>
                <span className={s.roleSub}>{sub}</span>
              </label>
            ))}
          </fieldset>
        )}

        {!isLogin && (
          <Field
            label="Full name"
            autoComplete="name"
            value={values.name}
            onChange={set('name')}
            error={errors.name}
          />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={isLogin ? undefined : 'At least 8 characters, with a letter and a number'}
        />
        <Notice>{formError && !Object.keys(errors).length ? formError : ''}</Notice>
        <Button type="submit" variant="accent" busy={busy}>
          {isLogin ? 'Log in' : 'Create account'}
        </Button>
        <p className={s.switch}>
          {isLogin ? (
            <>
              New to Hire the Fire? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
        {isLogin && (
          <p className={s.demo}>
            Trying the demo? Use <span className="data">seeker@demo.hirethefire.dev</span>,{' '}
            <span className="data">recruiter@…</span> or <span className="data">admin@…</span> with
            password <span className="data">Demo@1234</span>.
          </p>
        )}
      </form>
    </div>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
