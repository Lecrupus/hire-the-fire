import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../src/context/AuthContext';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { JobCard } from '../src/components/JobCard';
import { PostmarkTrail } from '../src/components/PostmarkTrail';
import { FilterSidebar } from '../src/pages/JobSearch';
import { Login, validateAuth } from '../src/pages/Auth';
import { validateJob } from '../src/pages/recruiter/JobForm';
import { salaryRange, experienceRange } from '../src/lib/format';

const withAuth = (ui, value) => (
  <AuthContext.Provider
    value={{ ready: true, user: null, login: vi.fn(), register: vi.fn(), ...value }}
  >
    {ui}
  </AuthContext.Provider>
);

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

describe('login form validation', () => {
  test('validateAuth mirrors the server rules', () => {
    expect(validateAuth({ name: '', email: 'bad', password: 'short' }, 'register')).toEqual({
      name: 'Enter your full name',
      email: 'Enter a valid email address',
      password: 'Use at least 8 characters',
    });
    expect(
      validateAuth({ name: 'Ananya', email: 'a@b.in', password: 'password' }, 'register').password,
    ).toMatch(/number/);
    expect(validateAuth({ email: 'a@b.in', password: 'x' }, 'login')).toEqual({});
  });

  test('shows inline errors and does not submit an invalid form', async () => {
    const login = vi.fn();
    render(
      withAuth(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
        { login },
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  test('submits valid credentials', async () => {
    const login = vi.fn().mockResolvedValue();
    render(
      withAuth(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
        { login },
      ),
    );
    await userEvent.type(screen.getByLabelText('Email'), 'seeker@demo.hirethefire.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'Demo@1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(login).toHaveBeenCalledWith({
      email: 'seeker@demo.hirethefire.dev',
      password: 'Demo@1234',
    });
  });
});

describe('JobCard', () => {
  const job = {
    _id: 'j1',
    title: 'Frontend Engineer (React)',
    company: { name: 'Kestrel Labs' },
    location: 'Bengaluru',
    remote: true,
    jobType: 'full-time',
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 1200000,
    salaryMax: 1800000,
    skills: ['react', 'css'],
    createdAt: new Date().toISOString(),
  };

  test('shows the facts a seeker scans for and links to the job', () => {
    render(
      <MemoryRouter>
        <JobCard job={job} match={{ matched: 1, total: 2, skills: ['react'] }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Frontend Engineer (React)' })).toHaveAttribute(
      'href',
      '/jobs/j1',
    );
    expect(screen.getByText('Kestrel Labs')).toBeInTheDocument();
    expect(screen.getByText('₹12–18 LPA')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('skills match')).toBeInTheDocument();
  });
});

describe('filter sidebar', () => {
  function Harness() {
    const [params, setParams] = useSearchParams();
    const onChange = (k, v) => {
      const next = new URLSearchParams(params);
      if (v) next.set(k, v);
      else next.delete(k);
      setParams(next);
    };
    return (
      <>
        <FilterSidebar params={params} onChange={onChange} />
        <Where />
      </>
    );
  }

  test('updates the URL query as filters change', async () => {
    render(
      <MemoryRouter initialEntries={['/jobs?q=react']}>
        <Harness />
      </MemoryRouter>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Job type'), 'internship');
    await userEvent.click(screen.getByLabelText('Remote only'));
    const where = screen.getByTestId('where').textContent;
    expect(where).toContain('q=react');
    expect(where).toContain('jobType=internship');
    expect(where).toContain('remote=true');
  });
});

describe('ProtectedRoute', () => {
  const routes = (
    <Routes>
      <Route element={<ProtectedRoute roles={['recruiter']} />}>
        <Route path="/recruiter" element={<p>pipeline</p>} />
      </Route>
      <Route path="*" element={<Where />} />
    </Routes>
  );

  test('sends guests to the login page', () => {
    render(
      withAuth(<MemoryRouter initialEntries={['/recruiter']}>{routes}</MemoryRouter>, {
        user: null,
      }),
    );
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  test('sends the wrong role to its own home', () => {
    render(
      withAuth(<MemoryRouter initialEntries={['/recruiter']}>{routes}</MemoryRouter>, {
        user: { role: 'seeker' },
      }),
    );
    expect(screen.getByTestId('where')).toHaveTextContent('/jobs');
  });

  test('lets the right role in', () => {
    render(
      withAuth(<MemoryRouter initialEntries={['/recruiter']}>{routes}</MemoryRouter>, {
        user: { role: 'recruiter' },
      }),
    );
    expect(screen.getByText('pipeline')).toBeInTheDocument();
  });
});

describe('postmark trail and formatting', () => {
  test('describes the whole history for screen readers', () => {
    render(
      <PostmarkTrail
        history={[
          { status: 'applied', changedAt: '2026-10-28T10:00:00Z' },
          { status: 'shortlisted', changedAt: '2026-10-30T10:00:00Z' },
        ]}
      />,
    );
    expect(screen.getByRole('list')).toHaveAccessibleName(/Applied on .* then Shortlisted on/);
  });

  test('salary and experience ranges', () => {
    expect(salaryRange(0, 0)).toBe('Salary not disclosed');
    expect(salaryRange(600000, 600000)).toBe('₹6 LPA');
    expect(experienceRange(3, 0)).toBe('3+ yrs');
  });

  test('job form validation', () => {
    expect(
      validateJob({
        title: 'QA',
        description: 'short',
        experienceMin: 3,
        experienceMax: 1,
        salaryMin: 10,
        salaryMax: 5,
      }),
    ).toEqual({
      title: expect.any(String),
      description: expect.any(String),
      experienceMax: expect.any(String),
      salaryMax: expect.any(String),
    });
  });
});
