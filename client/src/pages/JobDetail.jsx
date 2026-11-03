import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  Globe,
  IndianRupee,
  MapPin,
  SearchX,
} from 'lucide-react';
import { applicationsApi, jobsApi, usersApi } from '../api';
import { fileUrl } from '../api/client';
import { useAuth, useFetch } from '../hooks';
import {
  JOB_TYPE_LABEL,
  experienceRange,
  fullDate,
  salaryRange,
  trackingCode,
} from '../lib/format';
import { PostmarkTrail } from '../components/PostmarkTrail';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  Skeleton,
  StatusBadge,
} from '../components/ui';
import p from './pages.module.css';
import s from './JobDetail.module.css';

function ApplyPanel({ job }) {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mine = useFetch(
    () => (user?.role === 'seeker' ? applicationsApi.mine() : Promise.resolve([])),
    [user?._id],
  );
  const existing = mine.data?.find((a) => (a.job?._id || a.job) === job._id);
  const saved = user?.savedJobs?.includes(job._id);

  const toggleSave = async () => {
    try {
      if (saved) await usersApi.unsave(job._id);
      else await usersApi.save(job._id);
      setUser({
        ...user,
        savedJobs: saved
          ? user.savedJobs.filter((id) => id !== job._id)
          : [...user.savedJobs, job._id],
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await jobsApi.apply(job._id, note);
      mine.reload();
    } catch (err) {
      setError(err.message);
      if (err.code === 'DUPLICATE_APPLICATION') mine.reload();
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className={s.applyBox}>
        <h2 className={p.sectionTitle}>Apply for this job</h2>
        <p className={p.muted}>Log in as a job seeker to apply with your saved resume.</p>
        <Button to="/login" state={{ from: location.pathname }}>
          Log in to apply
        </Button>
        <p className={p.muted}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    );
  }
  if (user.role !== 'seeker') {
    return (
      <div className={s.applyBox}>
        <p className={p.muted}>You are signed in as a {user.role}. Only job seekers can apply.</p>
      </div>
    );
  }
  if (mine.loading && !mine.data) return <Skeleton rows={2} height={48} />;

  if (existing) {
    return (
      <div className={s.applyBox}>
        <h2 className={p.sectionTitle}>Your application</h2>
        <p className={s.statusLine}>
          <StatusBadge status={existing.status} />{' '}
          <span className="data">{trackingCode('APP', existing._id)}</span>
        </p>
        <PostmarkTrail history={existing.history} />
        <Link to="/applications">See all my applications</Link>
      </div>
    );
  }

  return (
    <form className={s.applyBox} onSubmit={apply}>
      <h2 className={p.sectionTitle}>Apply for this job</h2>
      {job.status !== 'open' ? (
        <Notice>This job is closed and no longer takes applications.</Notice>
      ) : !user.profile?.resumeUrl ? (
        <>
          <p className={p.muted}>
            Upload a resume to your profile first. It is sent with every application.
          </p>
          <Button to="/profile">Add a resume</Button>
        </>
      ) : (
        <>
          <p className={p.muted}>
            Your saved resume is sent.{' '}
            <a href={fileUrl(user.profile.resumeUrl)} target="_blank" rel="noreferrer">
              Check it
            </a>
          </p>
          <Field
            as="textarea"
            label="Note to the recruiter (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="One or two lines on why this role"
          />
          <Button type="submit" variant="accent" busy={busy}>
            Apply now
          </Button>
        </>
      )}
      <Notice>{error}</Notice>
      <Button variant="secondary" icon={saved ? BookmarkCheck : Bookmark} onClick={toggleSave}>
        {saved ? 'Saved' : 'Save for later'}
      </Button>
    </form>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const job = useFetch(() => jobsApi.get(id), [id]);

  if (job.loading && !job.data) return <Skeleton rows={4} height={80} />;
  if (job.error?.status === 404 || job.error?.code === 'VALIDATION_ERROR') {
    return (
      <EmptyState
        icon={SearchX}
        title="This job is not on the board"
        action={<Button to="/jobs">Browse open jobs</Button>}
      >
        It may have been removed, or the link is wrong.
      </EmptyState>
    );
  }
  if (job.error) return <ErrorState error={job.error} onRetry={job.reload} />;

  const j = job.data;
  const company = j.company || {};
  return (
    <div className={p.page}>
      <Link to="/jobs" className={s.back}>
        <ArrowLeft size={16} aria-hidden /> All jobs
      </Link>
      <div className={s.layout}>
        <article className={`${p.panel} ${s.main}`}>
          <header className={s.header}>
            <div className={s.logo} aria-hidden="true">
              {company.logoUrl ? <img src={fileUrl(company.logoUrl)} alt="" /> : company.name?.[0]}
            </div>
            <div>
              <h1 className={s.title}>{j.title}</h1>
              <p className={s.company}>
                {company.name} <span className="data">{trackingCode('JOB', j._id)}</span>
              </p>
            </div>
          </header>
          {j.status === 'closed' && <Notice>This job is closed.</Notice>}
          <dl className={s.facts}>
            <div>
              <dt>
                <MapPin size={16} aria-hidden /> Location
              </dt>
              <dd>
                {j.location || 'Anywhere'}
                {j.remote ? ' · Remote' : ''}
              </dd>
            </div>
            <div>
              <dt>
                <IndianRupee size={16} aria-hidden /> Salary
              </dt>
              <dd>{salaryRange(j.salaryMin, j.salaryMax)}</dd>
            </div>
            <div>
              <dt>
                <Briefcase size={16} aria-hidden /> Type
              </dt>
              <dd>
                {JOB_TYPE_LABEL[j.jobType]} · {experienceRange(j.experienceMin, j.experienceMax)}
              </dd>
            </div>
            <div>
              <dt>
                <Clock size={16} aria-hidden /> Posted
              </dt>
              <dd>{fullDate(j.publishedAt || j.createdAt)}</dd>
            </div>
          </dl>
          {j.skills.length > 0 && (
            <section>
              <h2 className={p.sectionTitle}>Skills</h2>
              <ul className={s.skills}>
                {j.skills.map((sk) => (
                  <li key={sk}>{sk}</li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className={p.sectionTitle}>About the role</h2>
            <div className={s.description}>{j.description}</div>
          </section>
        </article>

        <aside className={s.side}>
          <div className={p.panel}>
            <ApplyPanel job={j} />
          </div>
          <section
            className={`${p.panel} ${p.panelPad} ${s.companyCard}`}
            aria-labelledby="about-company"
          >
            <h2 id="about-company" className={p.sectionTitle}>
              About {company.name}
            </h2>
            {company.about && <p>{company.about}</p>}
            {company.location && (
              <p className={p.muted}>
                <MapPin size={14} aria-hidden /> {company.location}
              </p>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer">
                <Globe size={14} aria-hidden /> {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
