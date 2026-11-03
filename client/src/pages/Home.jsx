import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { jobsApi } from '../api';
import { useAuth, useFetch } from '../hooks';
import { JobCard } from '../components/JobCard';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';
import p from './pages.module.css';
import s from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const latest = useFetch(() => jobsApi.search({ limit: 50, sort: '-createdAt' }), []);

  const topSkills = useMemo(() => {
    const counts = {};
    for (const j of latest.data?.items || [])
      for (const sk of j.skills) counts[sk] = (counts[sk] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [latest.data]);

  const onSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (location.trim()) params.set('location', location.trim());
    navigate(`/jobs?${params}`);
  };

  return (
    <div className={p.page}>
      <section className={s.hero}>
        <h1 className={s.headline}>Find a job. Track every move.</h1>
        <p className={s.lede}>
          Search open roles across India, apply with your saved resume, and see each status change
          as it is stamped.
        </p>
        <form className={s.search} onSubmit={onSearch} role="search">
          <label className={s.searchField}>
            <Search size={18} aria-hidden />
            <span className="visually-hidden">Job title, skill or company</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Job title, skill or company"
            />
          </label>
          <label className={s.searchField}>
            <MapPin size={18} aria-hidden />
            <span className="visually-hidden">City</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, e.g. Mumbai"
            />
          </label>
          <Button type="submit" variant="accent">
            Search jobs
          </Button>
        </form>
        {!user && (
          <p className={s.recruiterLine}>
            Hiring? <Link to="/register?role=recruiter">Create a recruiter account</Link> and post
            your first job in a few minutes.
          </p>
        )}
      </section>

      <div className={s.columns}>
        <section className={p.panel} aria-labelledby="latest">
          <div className={p.panelHead}>
            <h2 id="latest">Latest jobs</h2>
            <Link to="/jobs">See all jobs</Link>
          </div>
          {latest.loading && !latest.data && <Skeleton rows={5} height={92} />}
          {latest.error && <ErrorState error={latest.error} onRetry={latest.reload} />}
          {latest.data?.items.length === 0 && (
            <EmptyState title="No jobs posted yet">
              The board is cold for now. Check back soon, or post one if you are hiring.
            </EmptyState>
          )}
          {latest.data?.items.slice(0, 6).map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </section>

        <aside className={`${p.panel} ${s.skills}`} aria-labelledby="skills">
          <div className={p.panelHead}>
            <h2 id="skills">Skills in demand</h2>
          </div>
          {topSkills.length > 0 ? (
            <ol className={s.skillList}>
              {topSkills.map(([skill, n]) => (
                <li key={skill}>
                  <Link to={`/jobs?q=${encodeURIComponent(skill)}`}>{skill}</Link>
                  <span className="data">{n}</span>
                </li>
              ))}
            </ol>
          ) : (
            !latest.loading && (
              <p className={`${p.muted} ${p.panelPad}`}>Skills appear here once jobs are posted.</p>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
