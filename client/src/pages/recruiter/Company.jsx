import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus } from 'lucide-react';
import { recruiterApi } from '../../api';
import { fileUrl } from '../../api/client';
import { useAuth } from '../../hooks';
import { Button, Field, Notice, PageHeader } from '../../components/ui';
import p from '../pages.module.css';
import s from './Company.module.css';

export default function Company() {
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const existing = user.company;
  const [values, setValues] = useState({
    name: existing?.name || '',
    website: existing?.website || '',
    location: existing?.location || '',
    about: existing?.about || '',
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ tone: 'success', text: '' });
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef();

  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (values.name.trim().length < 2) found.name = 'Enter your company name';
    if (values.website && !/^https?:\/\//.test(values.website))
      found.website = 'Start with https://';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setNotice({ text: '' });
    try {
      if (existing) await recruiterApi.updateCompany(existing._id, values);
      else await recruiterApi.createCompany(values);
      await reload();
      if (!existing) navigate('/recruiter/jobs/new');
      else setNotice({ tone: 'success', text: 'Company profile saved.' });
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type))
      return setNotice({ tone: 'error', text: 'Logo must be a PNG or JPEG.' });
    if (file.size > 2 * 1024 * 1024)
      return setNotice({ tone: 'error', text: 'Logo must be 2 MB or smaller.' });
    setLogoBusy(true);
    try {
      await recruiterApi.uploadLogo(existing._id, file);
      await reload();
      setNotice({ tone: 'success', text: 'Logo updated.' });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className={`${p.page} ${p.narrow}`}>
      <PageHeader
        title={existing ? 'Company profile' : 'Set up your company'}
        meta="Seekers see this on every job you post."
      />
      {existing && (
        <section className={`${p.panel} ${p.panelPad} ${s.logoRow}`} aria-label="Logo">
          <div className={s.logo}>
            {existing.logoUrl ? (
              <img src={fileUrl(existing.logoUrl)} alt={`${existing.name} logo`} />
            ) : (
              <span aria-hidden="true">{existing.name[0]}</span>
            )}
          </div>
          <div className={s.logoText}>
            <h2 className={p.sectionTitle}>Logo</h2>
            <p className={p.muted}>Square PNG or JPEG, up to 2 MB.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={upload} />
          <Button
            variant="secondary"
            icon={ImagePlus}
            busy={logoBusy}
            onClick={() => fileRef.current.click()}
          >
            {existing.logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
        </section>
      )}
      <form className={`${p.panel} ${p.panelPad} ${p.form}`} onSubmit={save} noValidate>
        <Field
          label="Company name"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
        />
        <div className={p.row2}>
          <Field
            label="Website"
            type="url"
            value={values.website}
            onChange={set('website')}
            error={errors.website}
            placeholder="https://"
          />
          <Field
            label="City"
            value={values.location}
            onChange={set('location')}
            placeholder="e.g. Bengaluru"
          />
        </div>
        <Field
          as="textarea"
          label="About"
          rows={5}
          value={values.about}
          onChange={set('about')}
          hint="Two or three lines on what you build and how the team works."
        />
        <Notice tone={notice.tone}>{notice.text}</Notice>
        <div className={p.formActions}>
          <Button type="submit" busy={busy}>
            {existing ? 'Save company' : 'Create company and post a job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
