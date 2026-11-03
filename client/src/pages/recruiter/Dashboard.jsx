import { Link } from 'react-router-dom';
import { Building2, PlusCircle } from 'lucide-react';
import { recruiterApi } from '../../api';
import { useAuth, useFetch } from '../../hooks';
import { STATUS_LABEL, ago } from '../../lib/format';
import { StageStrip } from '../../components/StageStrip';
import { DailyChart } from '../../components/DailyChart';
import { PostmarkTrail } from '../../components/PostmarkTrail';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui';
import p from '../pages.module.css';
import s from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useFetch(() => recruiterApi.stats(), []);
  const jobs = useFetch(() => recruiterApi.jobs(), []);

  if (!user.company) {
    return (
      <div className={p.page}>
        <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} />
        <EmptyState
          icon={Building2}
          title="Set up your company first"
          action={<Button to="/recruiter/company">Create company profile</Button>}
        >
          Jobs are posted under a company. It takes a minute: a name, a city, and a logo if you have
          one.
        </EmptyState>
      </div>
    );
  }

  const d = stats.data;
  const active = (jobs.data || []).filter((j) => j.status === 'open');
  const needsReview = (jobs.data || [])
    .map((j) => ({ ...j, waiting: j.statusCounts?.applied || 0 }))
    .filter((j) => j.waiting > 0 && j.status === 'open')
    .sort((a, b) => b.waiting - a.waiting);

  return (
    <div className={p.page}>
      <PageHeader
        title="Dashboard"
        meta={
          d
            ? `${user.company.name} · ${d.jobs.open} open of ${d.jobs.total} jobs · ${d.applications.total} applications in total`
            : user.company.name
        }
        actions={
          <Button to="/recruiter/jobs/new" icon={PlusCircle}>
            Post a job
          </Button>
        }
      />

      {stats.error && <ErrorState error={stats.error} onRetry={stats.reload} />}
      {stats.loading && !d && <Skeleton rows={1} height={84} />}
      {d && (
        <StageStrip
          counts={d.applications.byStatus}
          includeAll
          label="Applicants by stage, all jobs"
        />
      )}

      <div className={s.grid}>
        <section className={`${p.panel} ${s.chart}`} aria-labelledby="per-day">
          <div className={p.panelHead}>
            <h2 id="per-day">Applications per day</h2>
            <span className={p.muted}>
              Last 30 days{d ? ` · ${d.perDay.reduce((a, x) => a + x.count, 0)} received` : ''}
            </span>
          </div>
          {d ? (
            d.perDay.some((x) => x.count) ? (
              <DailyChart days={d.perDay} />
            ) : (
              <p className={`${p.panelPad} ${p.muted}`}>No applications in the last 30 days.</p>
            )
          ) : (
            <Skeleton rows={1} height={200} />
          )}
        </section>

        <section className={p.panel} aria-labelledby="to-review">
          <div className={p.panelHead}>
            <h2 id="to-review">Waiting for review</h2>
            <Link to="/recruiter/jobs">All jobs</Link>
          </div>
          {jobs.loading && !jobs.data && <Skeleton rows={3} height={48} />}
          {jobs.data && needsReview.length === 0 && (
            <p className={`${p.panelPad} ${p.muted}`}>
              {active.length
                ? 'Inbox zero. Every applicant has been looked at.'
                : 'No open jobs yet. Post one to start receiving applicants.'}
            </p>
          )}
          <ul className={s.review}>
            {needsReview.slice(0, 6).map((j) => (
              <li key={j._id}>
                <Link to={`/recruiter/jobs/${j._id}/applicants?status=applied`}>
                  <span className={p.strong}>{j.title}</span>
                  <span className={p.sub}>{j.location || 'Remote'}</span>
                </Link>
                <span className={s.waiting}>
                  <strong>{j.waiting}</strong> new
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={p.panel} aria-labelledby="recent">
        <div className={p.panelHead}>
          <h2 id="recent">Recent moves</h2>
          <span className={p.muted}>Latest status changes across your jobs</span>
        </div>
        {d && d.recentMoves.length === 0 && (
          <p className={`${p.panelPad} ${p.muted}`}>No applications yet.</p>
        )}
        {d && d.recentMoves.length > 0 && (
          <div className={s.tableWrap}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th scope="col">Applicant</th>
                  <th scope="col">Job</th>
                  <th scope="col">Status</th>
                  <th scope="col">Trail</th>
                  <th scope="col">Moved</th>
                </tr>
              </thead>
              <tbody>
                {d.recentMoves.map((a) => (
                  <tr key={a._id}>
                    <td className={p.strong}>{a.applicant?.name}</td>
                    <td>
                      <Link to={`/recruiter/jobs/${a.job?._id}/applicants`}>{a.job?.title}</Link>
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                      <span className="visually-hidden">{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td>
                      <PostmarkTrail history={a.history} compact />
                    </td>
                    <td className={p.muted}>{ago(a.lastMovedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
