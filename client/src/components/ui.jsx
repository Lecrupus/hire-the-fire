import { forwardRef, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RotateCcw, X } from 'lucide-react';
import { STATUS_LABEL } from '../lib/format';
import s from './ui.module.css';

const cx = (...c) => c.filter(Boolean).join(' ');

/** Buttons and button-styled links. variant: primary | secondary | ghost | danger | accent */
export function Button({
  variant = 'primary',
  size,
  to,
  busy,
  icon: Icon,
  children,
  className,
  ...rest
}) {
  const cls = cx(s.btn, s[variant], size === 'sm' && s.sm, className);
  const content = (
    <>
      {busy ? (
        <Loader2 className={s.spin} size={16} aria-hidden />
      ) : (
        Icon && <Icon size={16} aria-hidden />
      )}
      {children && <span>{children}</span>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      disabled={busy || rest.disabled}
      aria-busy={busy || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}

/** Labelled input, select or textarea with hint and inline error, wired for screen readers. */
export const Field = forwardRef(function Field(
  { label, hint, error, as = 'input', className, children, ...rest },
  ref,
) {
  const id = useId();
  const Control = as;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <Control
        ref={ref}
        id={id}
        className={cx(s.control, error && s.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={`${id}-hint`} className={s.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

/** Skills as removable tags; Enter or comma adds one. */
export function TagInput({
  label,
  value,
  onChange,
  hint,
  placeholder = 'Type a skill and press Enter',
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.tagBox}>
        {value.map((tag) => (
          <span key={tag} className={s.tag}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value.replace(',', ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
        />
      </div>
      {hint && <p className={s.hint}>{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={cx(s.badge, s[`st-${status}`])}>{STATUS_LABEL[status] || status}</span>;
}

/** Placeholder rows shown while a list loads. */
export function Skeleton({ rows = 4, height = 56 }) {
  return (
    <div className={s.skeleton} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={s.skelRow} style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className={s.empty}>
      {Icon && <Icon size={28} strokeWidth={1.5} aria-hidden className={s.emptyIcon} />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className={s.errorBox} role="alert">
      <AlertTriangle size={20} aria-hidden />
      <div>
        <p className={s.errorTitle}>{error?.message || 'This did not load.'}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

/** Inline message after a form action. tone: error | success */
export function Notice({ tone = 'error', children }) {
  if (!children) return null;
  return (
    <p className={cx(s.notice, s[tone])} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className={s.pager} aria-label="Pagination">
      <Button
        variant="secondary"
        size="sm"
        icon={ChevronLeft}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span className="data">
        Page {page} of {pages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next <ChevronRight size={16} aria-hidden />
      </Button>
    </nav>
  );
}

/** Page heading row: title (+ meta line beneath) on the left, actions on the right. */
export function PageHeader({ title, meta, actions }) {
  return (
    <header className={s.pageHeader}>
      <div>
        <h1>{title}</h1>
        {meta && <p className={s.meta}>{meta}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
