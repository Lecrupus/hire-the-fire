import { Fragment, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, Mail, Pencil, Search, Users } from 'lucide-react';
import { applicationsApi, jobsApi } from '../../api';
import { fileUrl } from '../../api/client';
import { useFetch } from '../../hooks';
import {
  NEXT_MOVES,
  STATUS_LABEL,
  dayMonth,
  fullDate,
  salaryRange,
  trackingCode,
} from '../../lib/format';
import { StageStrip } from '../../components/StageStrip';
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
import s from './Pipeline.module.css';

const MOVE_LABEL = {
  shortlisted: 'Shortlist',
  interview: 'Interview',
  hired: 'Hire',
  rejected: 'Reject',
  applied: 'Back to applied',
};
const CANCELLED = ['rejected', 'withdrawn'];
// Row buttons only move people forward (or reject); stepping back is rare and not worth a button.
const ORDER = ['applied', 'shortlisted', 'interview', 'hired'];

function Details({ app, job, onNotes }) {
  const [notes, setNotes] = useState(app.recruiterNotes || '');
  const [state, setState] = useState({ busy: false, msg: '' });
  const a = app.applicant || {};
  const save = async () => {
    setState({ busy: true, msg: '' });
    try {
      await onNotes(app._id, notes);
      setState({ busy: false, msg: 'Saved' });
    } catch (e) {
      setState({ busy: false, msg: e.message });
    }
  };
  return (
    <div className={s.details}>
      <div className={s.detailCol}>
        <h3 className={s.detailHead}>Applicant</h3>
        <p>
          <Mail size={14} aria-hidden /> <a href={`mailto:${a.email}`}>{a.email}</a>
        </p>
        {app.resumeUrl && (
          <p>
            <FileText size={14} aria-hidden />{' '}
            <a href={fileUrl(app.resumeUrl)} target="_blank" rel="noreferrer">
              Open resume (PDF)
            </a>
          </p>
        )}
        {Object.entries(a.profile?.links || {})
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <p key={k}>
              <a href={v} target="_blank" rel="noreferrer">
                {k[0].toUpperCase() + k.slice(1)}
              </a>
            </p>
          ))}
        <h3 className={s.detailHead}>Skills against this job</h3>
        <ul className={s.skillList}>
          {job.skills.map((sk) => (
            <li key={sk} className={app.match.skills.includes(sk) ? s.have : s.missing}>
              {sk}
            </li>
          ))}
        </ul>
      </div>
      <div className={s.detailCol}>
        <h3 className={s.detailHead}>Cover note</h3>
        <p className={s.note}>{app.coverNote || <span className={p.muted}>No note sent.</span>}</p>
        <h3 className={s.detailHead}>History</h3>
        <ol className={s.history}>
          {app.history.map((h) => (
            <li key={h.changedAt + h.status}>
              <StatusBadge status={h.status} />{' '}
              <span className={p.muted}>{fullDate(h.changedAt)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className={s.detailCol}>
        <label className={s.detailHead} htmlFor={`notes-${app._id}`}>
          Private notes
        </label>
        <textarea
          id={`notes-${app._id}`}
          className={s.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Only your team sees this"
        />
        <div className={s.noteActions}>
          <Button
            size="sm"
            variant="secondary"
            busy={state.busy}
            onClick={save}
            disabled={notes === (app.recruiterNotes || '')}
          >
            Save notes
          </Button>
          <span className={p.muted} role="status">
            {state.msg}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const stage = params.get('status') || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('moved');
  const [open, setOpen] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const job = useFetch(() => jobsApi.get(id), [id]);
  const apps = useFetch(() => jobsApi.applicants(id), [id]);

  const counts = useMemo(() => {
    const c = {};
    for (const a of apps.data || [])
      if (a.status !== 'withdrawn') c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [apps.data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = (apps.data || []).filter((a) => stage === 'all' || a.status === stage);
    if (needle) {
      list = list.filter(
        (a) =>
          a.applicant?.name.toLowerCase().includes(needle) ||
          a.applicant?.profile?.skills?.some((sk) => sk.includes(needle)),
      );
    }
    const by = {
      moved: (a, b) => new Date(b.lastMovedAt) - new Date(a.lastMovedAt),
      match: (a, b) =>
        b.match.matched - a.match.matched || new Date(b.lastMovedAt) - new Date(a.lastMovedAt),
      applied: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    };
    return [...list].sort(by[sort]);
  }, [apps.data, stage, q, sort]);

  const selectStage = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'all') next.delete('status');
    else next.set('status', key);
    setParams(next, { replace: true });
  };

  const move = async (app, to) => {
    setBusy(app._id + to);
    setError('');
    try {
      const updated = await applicationsApi.move(app._id, to);
      apps.setData((list) =>
        list.map((a) =>
          a._id === app._id
            ? {
                ...a,
                status: updated.status,
                history: updated.history,
                lastMovedAt: updated.lastMovedAt,
              }
            : a,
        ),
      );
      setFresh(app._id);
    } catch (e) {
      setError(`${app.applicant?.name}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async (appId, notes) => {
    await applicationsApi.notes(appId, notes);
    apps.setData((list) =>
      list.map((a) => (a._id === appId ? { ...a, recruiterNotes: notes } : a)),
    );
  };

  if (job.error) return <ErrorState error={job.error} onRetry={job.reload} />;
  const j = job.data;

  return (
    <div className={p.page}>
      {j ? (
        <PageHeader
          title={j.title}
          meta={
            <>
              <span className={s.jobId}>{trackingCode('JOB', j._id)}</span> ·{' '}
              {j.status === 'open'
                ? `Open since ${dayMonth(j.publishedAt || j.createdAt)}`
                : j.status === 'draft'
                  ? 'Draft, not published'
                  : 'Closed'}{' '}
              · {j.location || 'Remote'} · {salaryRange(j.salaryMin, j.salaryMax)}
            </>
          }
          actions={
            <Button variant="secondary" icon={Pencil} to={`/recruiter/jobs/${j._id}/edit`}>
              Edit job
            </Button>
          }
        />
      ) : (
        <Skeleton rows={1} height={56} />
      )}

      <StageStrip
        counts={counts}
        active={stage}
        onSelect={selectStage}
        label="Filter applicants by stage"
      />

      <div className={s.toolbar}>
        <label className={s.search}>
          <Search size={16} aria-hidden />
          <span className="visually-hidden">Search applicants</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or skill"
          />
        </label>
        <label className={s.sort}>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="moved">Last moved</option>
            <option value="match">Skill match</option>
            <option value="applied">Newest applied</option>
          </select>
        </label>
      </div>

      <Notice>{error}</Notice>
      {apps.loading && !apps.data && <Skeleton rows={6} height={64} />}
      {apps.error && <ErrorState error={apps.error} onRetry={apps.reload} />}
      {apps.data?.length === 0 && (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          action={
            j?.status !== 'open' ? (
              <Button to={`/recruiter/jobs/${id}/edit`}>Publish this job</Button>
            ) : null
          }
        >
          {j?.status === 'open'
            ? 'The post is out. Applicants appear here the moment they apply.'
            : 'Publish the job to start receiving applications.'}
        </EmptyState>
      )}
      {apps.data?.length > 0 && rows.length === 0 && (
        <EmptyState
          title={`No applicants ${stage === 'all' ? 'match' : `in ${STATUS_LABEL[stage]}`}${q ? ` for “${q}”` : ''}`}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ('');
                selectStage('all');
              }}
            >
              Show everyone
            </Button>
          }
        />
      )}

      {rows.length > 0 && (
        <div className={p.tableWrap}>
          <table className={`${p.table} ${s.table}`}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Details</span>
                </th>
                <th scope="col">Applicant</th>
                <th scope="col" className={p.num}>
                  Skill match
                </th>
                <th scope="col">Applied</th>
                <th scope="col">Status</th>
                <th scope="col">Trail</th>
                <th scope="col">Move</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const expanded = open === a._id;
                const pr = a.applicant?.profile || {};
                return (
                  <Fragment key={a._id}>
                    <tr className={CANCELLED.includes(a.status) ? s.cancelled : undefined}>
                      <td className={s.toggleCell}>
                        <button
                          type="button"
                          className={s.toggle}
                          aria-expanded={expanded}
                          aria-controls={`d-${a._id}`}
                          onClick={() => setOpen(expanded ? null : a._id)}
                        >
                          {expanded ? (
                            <ChevronDown size={16} aria-hidden />
                          ) : (
                            <ChevronRight size={16} aria-hidden />
                          )}
                          <span className="visually-hidden">Details for {a.applicant?.name}</span>
                        </button>
                      </td>
                      <td>
                        <span className={s.name}>{a.applicant?.name}</span>
                        <span className={p.sub}>
                          {[
                            pr.headline,
                            pr.experienceYears ? `${pr.experienceYears} yrs` : null,
                            pr.location,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </td>
                      <td className={p.num}>
                        <span className={`data ${s.match}`}>
                          {a.match.matched}/{a.match.total}
                        </span>
                      </td>
                      <td className={p.muted}>{dayMonth(a.createdAt)}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        <PostmarkTrail history={a.history} fresh={fresh === a._id} compact />
                      </td>
                      <td>
                        <div className={s.moves}>
                          {NEXT_MOVES[a.status].length === 0 && (
                            <span className={p.muted}>Final</span>
                          )}
                          {NEXT_MOVES[a.status]
                            .filter(
                              (to) =>
                                to === 'rejected' || ORDER.indexOf(to) > ORDER.indexOf(a.status),
                            )
                            .map((to) => (
                              <Button
                                key={to}
                                size="sm"
                                variant={to === 'rejected' ? 'danger' : 'secondary'}
                                busy={busy === a._id + to}
                                onClick={() => move(a, to)}
                                aria-label={`${MOVE_LABEL[to]} ${a.applicant?.name}`}
                              >
                                {MOVE_LABEL[to]}
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className={s.detailRow}>
                        <td colSpan={7} id={`d-${a._id}`}>
                          <Details app={a} job={j} onNotes={saveNotes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {apps.data?.length > 0 && (
        <p className={p.muted}>
          Withdrawn applicants stay in the list, struck through.{' '}
          <Link to="/recruiter/jobs">Back to all jobs</Link>
        </p>
      )}
    </div>
  );
}
