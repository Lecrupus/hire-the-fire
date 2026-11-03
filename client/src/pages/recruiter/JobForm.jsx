import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobsApi } from '../../api';
import { useAuth } from '../../hooks';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  PageHeader,
  Skeleton,
  TagInput,
} from '../../components/ui';
import p from '../pages.module.css';

const EMPTY = {
  title: '',
  description: '',
  location: '',
  jobType: 'full-time',
  remote: false,
  experienceMin: 0,
  experienceMax: 0,
  salaryMin: '',
  salaryMax: '',
  skills: [],
};

/** Salaries are entered in LPA (lakh per annum) and stored in rupees. */
const toLpa = (n) => (n ? String(n / 100000) : '');
const fromLpa = (v) => Math.round((Number(v) || 0) * 100000);

export function validateJob(v) {
  const e = {};
  if (v.title.trim().length < 3) e.title = 'Give the job a title of at least 3 characters';
  if (v.description.trim().length < 30)
    e.description = 'Describe the role in at least 30 characters';
  if (Number(v.experienceMax) && Number(v.experienceMax) < Number(v.experienceMin))
    e.experienceMax = 'Must be at least the minimum';
  if (Number(v.salaryMax) && Number(v.salaryMax) < Number(v.salaryMin))
    e.salaryMax = 'Must be at least the minimum';
  return e;
}

export default function JobForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(id ? null : EMPTY);
  const [status, setStatus] = useState('draft');
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!id) return;
    jobsApi
      .get(id)
      .then((j) => {
        setStatus(j.status);
        setValues({ ...EMPTY, ...j, salaryMin: toLpa(j.salaryMin), salaryMax: toLpa(j.salaryMax) });
      })
      .catch(setLoadError);
  }, [id]);

  if (!user.company) {
    return (
      <EmptyState
        title="Create your company profile first"
        action={<Button to="/recruiter/company">Set up company</Button>}
      >
        Jobs are posted under your company name.
      </EmptyState>
    );
  }
  if (loadError) return <ErrorState error={loadError} />;
  if (!values) return <Skeleton rows={4} height={64} />;

  const set = (k) => (e) =>
    setValues({ ...values, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (publish) => {
    const found = validateJob(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(publish ? 'publish' : 'save');
    setFormError('');
    const body = {
      title: values.title,
      description: values.description,
      location: values.location,
      jobType: values.jobType,
      remote: values.remote,
      experienceMin: Number(values.experienceMin) || 0,
      experienceMax: Number(values.experienceMax) || 0,
      salaryMin: fromLpa(values.salaryMin),
      salaryMax: fromLpa(values.salaryMax),
      skills: values.skills,
    };
    try {
      let job;
      if (id) {
        job = await jobsApi.update(id, body);
        if (publish && status !== 'open') job = await jobsApi.setStatus(id, 'open');
      } else {
        job = await jobsApi.create({ ...body, status: publish ? 'open' : 'draft' });
      }
      navigate(
        publish || job.status === 'open'
          ? `/recruiter/jobs/${job._id}/applicants`
          : '/recruiter/jobs',
      );
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      setFormError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`${p.page} ${p.narrow}`}>
      <PageHeader
        title={id ? 'Edit job' : 'Post a job'}
        meta={
          id
            ? `Currently ${status}. Changes go live as soon as you save.`
            : `Posting as ${user.company.name}.`
        }
      />
      <form
        className={`${p.panel} ${p.panelPad} ${p.form}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
      >
        <Field
          label="Job title"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="e.g. Frontend Engineer (React)"
        />
        <div className={p.row2}>
          <Field
            label="City"
            value={values.location}
            onChange={set('location')}
            placeholder="e.g. Bengaluru"
          />
          <Field as="select" label="Job type" value={values.jobType} onChange={set('jobType')}>
            <option value="full-time">Full-time</option>
            <option value="internship">Internship</option>
            <option value="contract">Contract</option>
          </Field>
        </div>
        <label className={p.check}>
          <input type="checkbox" checked={values.remote} onChange={set('remote')} /> Remote allowed
        </label>
        <div className={p.row2}>
          <Field
            label="Experience from (years)"
            type="number"
            min={0}
            max={50}
            value={values.experienceMin}
            onChange={set('experienceMin')}
          />
          <Field
            label="Experience to (years)"
            type="number"
            min={0}
            max={50}
            value={values.experienceMax}
            onChange={set('experienceMax')}
            error={errors.experienceMax}
            hint="0 means no upper limit"
          />
          <Field
            label="Salary from (LPA)"
            type="number"
            min={0}
            step="0.1"
            value={values.salaryMin}
            onChange={set('salaryMin')}
            placeholder="e.g. 12"
          />
          <Field
            label="Salary to (LPA)"
            type="number"
            min={0}
            step="0.1"
            value={values.salaryMax}
            onChange={set('salaryMax')}
            error={errors.salaryMax}
            placeholder="e.g. 18"
            hint="LPA = lakh rupees per year"
          />
        </div>
        <TagInput
          label="Skills"
          value={values.skills}
          onChange={(skills) => setValues({ ...values, skills })}
          hint="Used for search and to rank this job for matching seekers."
        />
        <Field
          as="textarea"
          label="Description"
          rows={10}
          value={values.description}
          onChange={set('description')}
          error={errors.description}
          hint="What the person will do, and what you look for. Line breaks are kept."
        />
        <Notice>{formError && !Object.keys(errors).length ? formError : ''}</Notice>
        <div className={p.formActions}>
          <Button type="submit" variant="accent" busy={busy === 'publish'}>
            {id && status === 'open' ? 'Save changes' : 'Publish job'}
          </Button>
          {(!id || status !== 'open') && (
            <Button variant="secondary" busy={busy === 'save'} onClick={() => submit(false)}>
              {id ? 'Save' : 'Save as draft'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
