import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Shield,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks';
import { recruiterApi } from '../api';
import s from './Shell.module.css';

const NAV = {
  guest: [
    { to: '/jobs', label: 'Find jobs', icon: Search },
    { to: '/login', label: 'Log in', icon: LogIn },
    { to: '/register', label: 'Create account', icon: UserPlus },
  ],
  seeker: [
    { to: '/jobs', label: 'Find jobs', icon: Search },
    { to: '/applications', label: 'My applications', icon: FileText },
    { to: '/saved', label: 'Saved jobs', icon: Bookmark },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  recruiter: [
    { to: '/recruiter', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/recruiter/jobs', label: 'My jobs', icon: Briefcase, end: true },
    { to: '/recruiter/jobs/new', label: 'Post a job', icon: PlusCircle },
    { to: '/recruiter/company', label: 'Company', icon: Building2 },
  ],
  admin: [
    { to: '/admin', label: 'Moderation', icon: Shield },
    { to: '/jobs', label: 'Find jobs', icon: Search },
  ],
};

/** Open jobs listed in the rail for recruiters, current one marked, each linking to its pipeline. */
function RailJobs() {
  const { pathname } = useLocation();
  const id = useMatch('/recruiter/jobs/:id/*')?.params.id;
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    recruiterApi
      .jobs()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, [pathname]);

  const open = (jobs || []).filter((j) => j.status === 'open');
  if (!jobs || !open.length) return null;
  return (
    <section className={s.railJobs} aria-labelledby="rail-jobs">
      <h2 id="rail-jobs" className={s.railHeading}>
        Open jobs <span>{open.length}</span>
      </h2>
      <ul>
        {open.slice(0, 8).map((j) => (
          <li key={j._id}>
            <Link
              to={`/recruiter/jobs/${j._id}/applicants`}
              className={`${s.railJob} ${id === j._id ? s.current : ''}`}
              aria-current={id === j._id ? 'page' : undefined}
            >
              <span className={s.railJobTitle}>{j.title}</span>
              <span className={s.railJobMeta}>
                {j.location || 'Remote'} · {j.applicantCount}{' '}
                {j.applicantCount === 1 ? 'applicant' : 'applicants'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** App frame: postal-red rail on desktop, a top bar with a drawer on small screens. */
export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const role = user?.role || 'guest';

  useEffect(() => setOpen(false), [pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={s.frame}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <header className={s.topbar}>
        <Link to="/" className={s.brand}>
          Hire the Fire
        </Link>
        <button
          type="button"
          className={s.menuBtn}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="rail"
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          <span className="visually-hidden">Menu</span>
        </button>
      </header>

      <aside id="rail" className={`${s.rail} ${open ? s.railOpen : ''}`}>
        <Link to="/" className={`${s.brand} ${s.railBrand}`}>
          Hire the Fire
          {user && (
            <span className={s.who}>
              {role === 'recruiter'
                ? user.company?.name || 'Recruiter'
                : role === 'admin'
                  ? 'Admin'
                  : user.name}
            </span>
          )}
        </Link>

        <nav aria-label="Main">
          <ul className={s.nav}>
            {NAV[role].map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `${s.navLink} ${isActive ? s.active : ''}`}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {role === 'recruiter' && <RailJobs />}

        {user && (
          <div className={s.railFoot}>
            <span className={s.footName}>{user.name}</span>
            <button type="button" className={s.logout} onClick={onLogout}>
              <LogOut size={16} aria-hidden /> Log out
            </button>
          </div>
        )}
      </aside>
      {open && (
        <button
          type="button"
          className={s.scrim}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <main id="main" className={s.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
