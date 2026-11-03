import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PlusCircle } from 'lucide-react';
import { jobsApi, recruiterApi } from '../../api';
import { useFetch } from '../../hooks';
import { dayMonth, trackingCode } from '../../lib/format';
import { Button, EmptyState, ErrorState, Notice, PageHeader, Skeleton } from '../../components/ui';
import p from '../pages.module.css';
import s from './MyJobs.module.css';

const JOB_STATUS = { open: 'Open', closed: 'Closed', draft: 'Draft' };

export default function MyJobs() {
  const jobs = useFetch(() => recruiterApi.jobs(), []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const setStatus = async (job, status) => {
    setBusy(job._id);
    setError('');
    try {
      const updated = await jobsApi.setStatus(job._id, status);
      jobs.setData((list) =>
        list.map((j) =>
          j._id === job._id
            ? { ...j, status: updated.status, publishedAt: updated.publishedAt }
            : j,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const list = (jobs.data || []).filter((j) => filter === 'all' || j.status === filter);

  return (
    <div className={p.page}>
      <PageHeader
        title="My jobs"
        meta="Open jobs take applications. Closing one keeps its pipeline; reopen it any time."
        actions={
          <Button to="/recruiter/jobs/new" icon={PlusCircle}>
            Post a job
          </Button>
        }
      />
      {jobs.data?.length > 0 && (
        <label className={s.filter}>
          Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All jobs ({jobs.data.length})</option>
            <option value="open">Open</option>
            <option value="draft">Drafts</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      )}
      <Notice>{error}</Notice>
      {jobs.loading && !jobs.data && <Skeleton rows={5} height={56} />}
      {jobs.error && <ErrorState error={jobs.error} onRetry={jobs.reload} />}
      {jobs.data?.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No jobs posted yet"
          action={<Button to="/recruiter/jobs/new">Post your first job</Button>}
        >
          Save it as a draft first if you want to check it before it goes live.
        </EmptyState>
      )}
      {list.length > 0 && (
        <div className={p.tableWrap}>
          <table className={p.table}>
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">State</th>
                <th scope="col" className={p.num}>
                  Applicants
                </th>
                <th scope="col" className={p.num}>
                  New
                </th>
                <th scope="col" className={p.num}>
                  Interview
                </th>
                <th scope="col" className={p.num}>
                  Hired
                </th>
                <th scope="col">Posted</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((j) => {
                const c = j.statusCounts || {};
                return (
                  <tr key={j._id}>
                    <td>
                      <Link to={`/recruiter/jobs/${j._id}/applicants`} className={s.title}>
                        {j.title}
                      </Link>
                      <span className={p.sub}>
                        <span className={s.code}>{trackingCode('JOB', j._id)}</span> ·{' '}
                        {j.location || 'Remote'}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.state} ${s[j.status]}`}>{JOB_STATUS[j.status]}</span>
                    </td>
                    <td className={`${p.num} ${p.strong}`}>{j.applicantCount}</td>
                    <td className={p.num}>{c.applied || 0}</td>
                    <td className={p.num}>{c.interview || 0}</td>
                    <td className={p.num}>{c.hired || 0}</td>
                    <td className={p.muted}>{j.publishedAt ? dayMonth(j.publishedAt) : '—'}</td>
                    <td>
                      <div className={s.actions}>
                        <Button size="sm" variant="ghost" to={`/recruiter/jobs/${j._id}/edit`}>
                          Edit
                        </Button>
                        {j.status === 'open' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            busy={busy === j._id}
                            onClick={() => setStatus(j, 'closed')}
                          >
                            Close
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            busy={busy === j._id}
                            onClick={() => setStatus(j, 'open')}
                          >
                            {j.status === 'draft' ? 'Publish' : 'Reopen'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
