import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { applicationsApi } from '../../api';
import { useFetch } from '../../hooks';
import { STATUS_LABEL, ago, trackingCode } from '../../lib/format';
import { PostmarkTrail } from '../../components/PostmarkTrail';
import {
  Button,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui';
import p from '../pages.module.css';
import s from './MyApplications.module.css';

const WITHDRAWABLE = ['applied', 'shortlisted', 'interview'];
const FILTERS = ['all', 'active', 'hired', 'closed'];

const inGroup = (status, f) =>
  f === 'all' ||
  (f === 'active' && WITHDRAWABLE.includes(status)) ||
  (f === 'hired' && status === 'hired') ||
  (f === 'closed' && ['rejected', 'withdrawn'].includes(status));

export default function MyApplications() {
  const apps = useFetch(() => applicationsApi.mine(), []);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(null);

  const withdraw = async (app) => {
    if (
      !window.confirm(
        `Withdraw your application for ${app.job?.title}? The recruiter will see it as withdrawn.`,
      )
    )
      return;
    setBusyId(app._id);
    setError('');
    try {
      const updated = await applicationsApi.withdraw(app._id);
      apps.setData((list) =>
        list.map((a) =>
          a._id === app._id ? { ...a, status: updated.status, history: updated.history } : a,
        ),
      );
      setFresh(app._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const list = (apps.data || []).filter((a) => inGroup(a.status, filter));
  const count = (f) => (apps.data || []).filter((a) => inGroup(a.status, f)).length;

  return (
    <div className={p.page}>
      <PageHeader
        title="My applications"
        meta="Every move a recruiter makes is stamped here with its date."
      />

      {apps.data?.length > 0 && (
        <div className={s.filters} role="tablist" aria-label="Filter applications">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`${s.tab} ${filter === f ? s.on : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'closed' ? 'Closed' : f[0].toUpperCase() + f.slice(1)}{' '}
              <span className="data">{count(f)}</span>
            </button>
          ))}
        </div>
      )}

      <Notice>{error}</Notice>
      {apps.loading && !apps.data && <Skeleton rows={4} height={88} />}
      {apps.error && <ErrorState error={apps.error} onRetry={apps.reload} />}
      {apps.data?.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Nothing in the post yet"
          action={<Button to="/jobs">Find a job to apply to</Button>}
        >
          Applications you send show up here with their full status history.
        </EmptyState>
      )}
      {apps.data?.length > 0 && list.length === 0 && (
        <p className={p.muted}>No applications in this group.</p>
      )}

      {list.length > 0 && (
        <ul className={s.list}>
          {list.map((a) => (
            <li
              key={a._id}
              className={`${s.item} ${['rejected', 'withdrawn'].includes(a.status) ? s.cancelled : ''}`}
            >
              <div className={s.what}>
                <h2 className={s.title}>
                  {a.job ? <Link to={`/jobs/${a.job._id}`}>{a.job.title}</Link> : 'Job removed'}
                </h2>
                <p className={p.muted}>
                  {a.job?.company?.name || a.job?.companyName} · {a.job?.location || 'Remote'} ·
                  applied {ago(a.createdAt)}
                </p>
                <p className={s.code}>
                  <span className="data">{trackingCode('APP', a._id)}</span>
                </p>
              </div>
              <div className={s.trail}>
                <PostmarkTrail history={a.history} fresh={fresh === a._id} />
              </div>
              <div className={s.status}>
                <StatusBadge status={a.status} />
                {WITHDRAWABLE.includes(a.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    busy={busyId === a._id}
                    onClick={() => withdraw(a)}
                    aria-label={`Withdraw application for ${a.job?.title}`}
                  >
                    Withdraw
                  </Button>
                )}
                <span className="visually-hidden">Status: {STATUS_LABEL[a.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
