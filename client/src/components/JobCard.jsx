import { Link } from 'react-router-dom';
import { MapPin, Wifi } from 'lucide-react';
import { JOB_TYPE_LABEL, ago, experienceRange, salaryRange } from '../lib/format';
import { fileUrl } from '../api/client';
import s from './JobCard.module.css';

/** One job in a list: company mark, title link, the facts a seeker scans for, and skills. */
export function JobCard({ job, match, aside }) {
  const company = job.company || {};
  const name = company.name || job.companyName;
  return (
    <article className={s.card}>
      <div className={s.logo} aria-hidden="true">
        {company.logoUrl ? (
          <img src={fileUrl(company.logoUrl)} alt="" />
        ) : (
          <span>{name?.[0] || '?'}</span>
        )}
      </div>
      <div className={s.body}>
        <h3 className={s.title}>
          <Link to={`/jobs/${job._id}`}>{job.title}</Link>
        </h3>
        <p className={s.company}>{name}</p>
        <ul className={s.facts}>
          <li>
            <MapPin size={14} aria-hidden /> {job.location || 'Anywhere'}
          </li>
          {job.remote && (
            <li>
              <Wifi size={14} aria-hidden /> Remote
            </li>
          )}
          <li>{JOB_TYPE_LABEL[job.jobType]}</li>
          <li>{experienceRange(job.experienceMin, job.experienceMax)}</li>
          <li className={s.salary}>{salaryRange(job.salaryMin, job.salaryMax)}</li>
        </ul>
        {job.skills?.length > 0 && (
          <ul className={s.skills} aria-label="Skills">
            {job.skills.slice(0, 6).map((sk) => (
              <li key={sk} className={match?.skills?.includes(sk) ? s.have : undefined}>
                {sk}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={s.side}>
        {match && (
          <span className={s.match}>
            <span className="data">
              {match.matched}/{match.total}
            </span>{' '}
            skills match
          </span>
        )}
        {job.status === 'closed' && <span className={s.closed}>Closed</span>}
        <span className={s.posted}>{ago(job.publishedAt || job.createdAt)}</span>
        {aside}
      </div>
    </article>
  );
}
