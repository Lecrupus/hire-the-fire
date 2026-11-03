import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { jobsApi } from '../api';
import { useDebounce, useFetch } from '../hooks';
import { JobCard } from '../components/JobCard';
import { Button, EmptyState, ErrorState, Field, Pagination, Skeleton } from '../components/ui';
import p from './pages.module.css';
import s from './JobSearch.module.css';

const FILTER_KEYS = ['location', 'jobType', 'remote', 'experience', 'salaryMin'];

/** Turns URL params into API params, dropping empty values. */
function toQuery(params) {
  const q = {};
  for (const [k, v] of params.entries()) if (v !== '') q[k] = v;
  return q;
}

/** Filter sidebar. Every change writes to the URL query, so results are shareable and back works. */
export function FilterSidebar({ params, onChange }) {
  const set = (key) => (e) =>
    onChange(key, e.target.type === 'checkbox' ? (e.target.checked ? 'true' : '') : e.target.value);
  return (
    <form className={s.filters} onSubmit={(e) => e.preventDefault()} aria-label="Filters">
      <Field
        label="City"
        value={params.get('location') || ''}
        onChange={set('location')}
        placeholder="Any city"
      />
      <Field
        as="select"
        label="Job type"
        value={params.get('jobType') || ''}
        onChange={set('jobType')}
      >
        <option value="">Any type</option>
        <option value="full-time">Full-time</option>
        <option value="internship">Internship</option>
        <option value="contract">Contract</option>
      </Field>
      <Field
        as="select"
        label="Your experience"
        value={params.get('experience') || ''}
        onChange={set('experience')}
      >
        <option value="">Any</option>
        <option value="0">Fresher (0 yrs)</option>
        <option value="1">1 year</option>
        <option value="2">2 years</option>
        <option value="3">3 years</option>
        <option value="5">5 years</option>
        <option value="8">8+ years</option>
      </Field>
      <Field
        as="select"
        label="Minimum salary"
        value={params.get('salaryMin') || ''}
        onChange={set('salaryMin')}
      >
        <option value="">Any</option>
        <option value="300000">₹3 LPA+</option>
        <option value="600000">₹6 LPA+</option>
        <option value="1000000">₹10 LPA+</option>
        <option value="1500000">₹15 LPA+</option>
        <option value="2500000">₹25 LPA+</option>
      </Field>
      <label className={p.check}>
        <input type="checkbox" checked={params.get('remote') === 'true'} onChange={set('remote')} />
        Remote only
      </label>
    </form>
  );
}

export default function JobSearch() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounce(q, 300);
  // Filters start collapsed on phones so results are the first thing seen; the summary is hidden on desktop.
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 900px)').matches,
  );

  // Typing updates the URL after a 300 ms pause, so one request fires per pause, not per key.
  useEffect(() => {
    if ((params.get('q') || '') === debouncedQ) return;
    const next = new URLSearchParams(params);
    if (debouncedQ) next.set('q', debouncedQ);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = params.toString();
  const result = useFetch(() => jobsApi.search(toQuery(params)), [key]);

  const update = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;
  const clear = () => {
    setQ('');
    setParams(new URLSearchParams());
  };

  const data = result.data;
  return (
    <div className={p.page}>
      <header className={s.head}>
        <h1>Find jobs</h1>
        <label className={s.searchBox}>
          <Search size={18} aria-hidden />
          <span className="visually-hidden">Search jobs</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, skill or company"
          />
        </label>
      </header>

      <div className={s.layout}>
        <details
          className={s.filterWrap}
          open={filtersOpen}
          onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
        >
          <summary className={s.filterToggle}>
            <SlidersHorizontal size={16} aria-hidden /> Filters{' '}
            {activeFilters > 0 && <span className="data">({activeFilters})</span>}
          </summary>
          <FilterSidebar params={params} onChange={update} />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear all filters
            </Button>
          )}
        </details>

        <section aria-live="polite" aria-busy={result.loading}>
          <div className={s.resultBar}>
            <p className={p.muted}>
              {data ? (
                <>
                  <strong className={p.strong}>{data.total}</strong>{' '}
                  {data.total === 1 ? 'job' : 'jobs'}
                  {params.get('q') ? ` for “${params.get('q')}”` : ''}
                </>
              ) : (
                'Searching…'
              )}
            </p>
            <label className={s.sort}>
              <span>Sort</span>
              <select
                value={params.get('sort') || (params.get('q') ? 'relevance' : '-createdAt')}
                onChange={(e) => update('sort', e.target.value)}
              >
                {params.get('q') && <option value="relevance">Best match</option>}
                <option value="-createdAt">Newest</option>
                <option value="-salaryMax">Highest salary</option>
              </select>
            </label>
          </div>

          {result.loading && !data && <Skeleton rows={6} height={110} />}
          {result.error && <ErrorState error={result.error} onRetry={result.reload} />}
          {data && data.items.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No jobs match these filters"
              action={
                <Button variant="secondary" onClick={clear}>
                  Clear search and filters
                </Button>
              }
            >
              Try a broader keyword, another city, or fewer filters.
            </EmptyState>
          )}
          {data && data.items.length > 0 && (
            <div className={`${p.list} ${result.loading ? s.stale : ''}`}>
              {data.items.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
          {data && (
            <Pagination
              page={data.page}
              pages={data.pages}
              onPage={(n) => update('page', String(n))}
            />
          )}
        </section>
      </div>
    </div>
  );
}
