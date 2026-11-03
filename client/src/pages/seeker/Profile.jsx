import { useRef, useState } from 'react';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import { usersApi } from '../../api';
import { fileUrl } from '../../api/client';
import { useAuth } from '../../hooks';
import { Button, Field, Notice, PageHeader, TagInput } from '../../components/ui';
import p from '../pages.module.css';
import s from './Profile.module.css';

const blankEdu = { school: '', degree: '', field: '', endYear: '' };
const blankExp = { company: '', title: '', startDate: '', endDate: '', description: '' };

/** Edits rows of a repeatable section (education, experience). */
function Rows({ title, rows, blank, fields, onChange }) {
  const update = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <fieldset className={s.rows}>
      <legend className={p.sectionTitle}>{title}</legend>
      {rows.length === 0 && <p className={p.muted}>Nothing added yet.</p>}
      {rows.map((row, i) => (
        <div key={i} className={s.rowItem}>
          <div className={p.row2}>
            {fields.map(([k, label, type]) => (
              <Field
                key={k}
                label={label}
                type={type}
                value={row[k] ?? ''}
                onChange={(e) => update(i, k, e.target.value)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        onClick={() => onChange([...rows, { ...blank }])}
      >
        Add {title.toLowerCase().replace(/s$/, '')}
      </Button>
    </fieldset>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const pr = user.profile || {};
  const [form, setForm] = useState({
    name: user.name,
    headline: pr.headline || '',
    location: pr.location || '',
    experienceYears: pr.experienceYears ?? 0,
    skills: pr.skills || [],
    education: pr.education || [],
    experience: pr.experience || [],
    links: { linkedin: '', github: '', portfolio: '', ...pr.links },
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ tone: 'success', text: '' });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const fileRef = useRef();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLink = (k) => (e) => setForm({ ...form, links: { ...form.links, [k]: e.target.value } });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setNotice({ text: '' });
    try {
      const { name, ...profile } = form;
      const clean = (rows) =>
        rows
          .filter((r) => Object.values(r).some(Boolean))
          .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '')));
      const updated = await usersApi.update({
        name,
        profile: {
          ...profile,
          experienceYears: Number(profile.experienceYears) || 0,
          education: clean(profile.education),
          experience: clean(profile.experience),
        },
      });
      setUser({ ...user, ...updated });
      setNotice({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      if (err.details)
        setErrors(
          Object.fromEntries(err.details.map((d) => [d.path.replace('profile.', ''), d.message])),
        );
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf')
      return setNotice({ tone: 'error', text: 'Resume must be a PDF.' });
    if (file.size > 2 * 1024 * 1024)
      return setNotice({ tone: 'error', text: 'Resume must be 2 MB or smaller.' });
    setProgress(0);
    try {
      const { resumeUrl } = await usersApi.uploadResume(file, (ev) =>
        setProgress(Math.round((ev.loaded / (ev.total || file.size)) * 100)),
      );
      setUser({ ...user, profile: { ...user.profile, resumeUrl } });
      setNotice({ tone: 'success', text: `Uploaded ${file.name}.` });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className={`${p.page} ${p.narrow}`}>
      <PageHeader title="My profile" meta="Recruiters see this with every application you send." />

      <section className={`${p.panel} ${p.panelPad} ${s.resume}`} aria-labelledby="resume">
        <div>
          <h2 id="resume" className={p.sectionTitle}>
            Resume
          </h2>
          {user.profile?.resumeUrl ? (
            <a
              href={fileUrl(user.profile.resumeUrl)}
              target="_blank"
              rel="noreferrer"
              className={s.file}
            >
              <FileText size={16} aria-hidden /> Current resume (PDF)
            </a>
          ) : (
            <p className={p.muted}>No resume yet. You need one to apply.</p>
          )}
          {progress !== null && (
            <div
              className={s.progress}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={upload} />
        <Button
          variant="secondary"
          icon={Upload}
          busy={progress !== null}
          onClick={() => fileRef.current.click()}
        >
          {user.profile?.resumeUrl ? 'Replace PDF' : 'Upload PDF'}
        </Button>
      </section>

      <form className={`${p.panel} ${p.panelPad} ${p.form}`} onSubmit={save} noValidate>
        <div className={p.row2}>
          <Field label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
          <Field
            label="Headline"
            value={form.headline}
            onChange={set('headline')}
            placeholder="e.g. React developer, 3 years"
            error={errors.headline}
          />
          <Field
            label="City"
            value={form.location}
            onChange={set('location')}
            placeholder="e.g. Pune"
          />
          <Field
            label="Years of experience"
            type="number"
            min={0}
            max={50}
            value={form.experienceYears}
            onChange={set('experienceYears')}
            error={errors.experienceYears}
          />
        </div>
        <TagInput
          label="Skills"
          value={form.skills}
          onChange={(skills) => setForm({ ...form, skills })}
          hint="Recommended jobs are ranked by these."
        />
        <div className={p.row3}>
          <Field
            label="LinkedIn"
            type="url"
            value={form.links.linkedin}
            onChange={setLink('linkedin')}
            placeholder="https://"
            error={errors['links.linkedin']}
          />
          <Field
            label="GitHub"
            type="url"
            value={form.links.github}
            onChange={setLink('github')}
            placeholder="https://"
            error={errors['links.github']}
          />
          <Field
            label="Portfolio"
            type="url"
            value={form.links.portfolio}
            onChange={setLink('portfolio')}
            placeholder="https://"
            error={errors['links.portfolio']}
          />
        </div>
        <Rows
          title="Experience"
          rows={form.experience}
          blank={blankExp}
          fields={[
            ['title', 'Title'],
            ['company', 'Company'],
            ['startDate', 'From (e.g. Jun 2023)'],
            ['endDate', 'To (blank if current)'],
          ]}
          onChange={(experience) => setForm({ ...form, experience })}
        />
        <Rows
          title="Education"
          rows={form.education}
          blank={blankEdu}
          fields={[
            ['school', 'College or school'],
            ['degree', 'Degree'],
            ['field', 'Field of study'],
            ['endYear', 'Year finished', 'number'],
          ]}
          onChange={(education) => setForm({ ...form, education })}
        />
        <Notice tone={notice.tone}>{notice.text}</Notice>
        <div className={p.formActions}>
          <Button type="submit" busy={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
