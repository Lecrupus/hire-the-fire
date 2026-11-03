import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { useDebounce, useFetch } from '../../hooks';
import { dayMonth } from '../../lib/format';
import { Button, ErrorState, Notice, PageHeader, Pagination, Skeleton } from '../../components/ui';
import p from '../pages.module.css';
import s from './Admin.module.css';

function Users({ onError }) {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q, 300);
  const users = useFetch(
    () => adminApi.users({ role: role || undefined, q: dq || undefined, page }),
    [role, dq, page],
  );
  const [busy, setBusy] = useState(null);

  const toggle = async (u) => {
    if (
      !u.isBlocked &&
      !window.confirm(`Block ${u.name}? They are logged out and cannot sign in until unblocked.`)
    )
      return;
    setBusy(u._id);
    try {
      const updated = await adminApi.block(u._id, !u.isBlocked);
      users.setData((d) => ({
        ...d,
        items: d.items.map((x) => (x._id === u._id ? { ...x, isBlocked: updated.isBlocked } : x)),
      }));
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={p.panel} aria-labelledby="users">
      <div className={p.panelHead}>
        <h2 id="users">Users</h2>
        <div className={s.controls}>
          <input
            type="search"
            aria-label="Search users"
            placeholder="Name or email"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="seeker">Seekers</option>
            <option value="recruiter">Recruiters</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>
      {users.error && <ErrorState error={users.error} onRetry={users.reload} />}
      {!users.data && users.loading && <Skeleton rows={5} height={44} />}
      {users.data && (
        <>
          <div className={s.scroll}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((u) => (
                  <tr key={u._id} className={u.isBlocked ? s.blocked : undefined}>
                    <td>
                      <span className={p.strong}>{u.name}</span>
                      <span className={p.sub}>{u.email}</span>
                    </td>
                    <td>{u.role}</td>
                    <td className={p.muted}>{dayMonth(u.createdAt)}</td>
                    <td>
                      {u.role === 'admin' ? (
                        <span className={p.muted}>Admin</span>
                      ) : (
                        <Button
                          size="sm"
                          variant={u.isBlocked ? 'secondary' : 'danger'}
                          busy={busy === u._id}
                          onClick={() => toggle(u)}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className={p.muted}>
                      No users match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={users.data.page} pages={users.data.pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}

function Jobs({ onError }) {
  const [page, setPage] = useState(1);
  const jobs = useFetch(() => adminApi.jobs({ page }), [page]);
  const remove = async (j) => {
    if (
      !window.confirm(
        `Remove “${j.title}” at ${j.companyName}? Its applications are removed too. This cannot be undone.`,
      )
    )
      return;
    try {
      await adminApi.removeJob(j._id);
      jobs.reload();
    } catch (e) {
      onError(e.message);
    }
  };
  return (
    <section className={p.panel} aria-labelledby="jobs">
      <div className={p.panelHead}>
        <h2 id="jobs">Jobs</h2>
      </div>
      {jobs.error && <ErrorState error={jobs.error} onRetry={jobs.reload} />}
      {!jobs.data && jobs.loading && <Skeleton rows={5} height={44} />}
      {jobs.data && (
        <>
          <div className={s.scroll}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">State</th>
                  <th scope="col" className={p.num}>
                    Applicants
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.items.map((j) => (
                  <tr key={j._id}>
                    <td>
                      <Link to={`/jobs/${j._id}`} className={p.strong}>
                        {j.title}
                      </Link>
                      <span className={p.sub}>{j.companyName}</span>
                    </td>
                    <td>{j.status}</td>
                    <td className={p.num}>{j.applicantCount}</td>
                    <td>
                      <Button size="sm" variant="danger" onClick={() => remove(j)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={jobs.data.page} pages={jobs.data.pages} onPage={setPage} />
        </>
      )}
    </section>
  );
}

export default function Admin() {
  const stats = useFetch(() => adminApi.stats(), []);
  const [error, setError] = useState('');
  const d = stats.data;
  return (
    <div className={p.page}>
      <PageHeader
        title="Moderation"
        meta={
          d
            ? `${d.users} users (${d.usersByRole.seeker || 0} seekers, ${d.usersByRole.recruiter || 0} recruiters) · ${d.jobs} jobs · ${d.applications} applications`
            : 'Platform totals load here.'
        }
      />
      <Notice>{error}</Notice>
      <div className={s.grid}>
        <Users onError={setError} />
        <Jobs onError={setError} />
      </div>
    </div>
  );
}
