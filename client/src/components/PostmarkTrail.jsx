import { STATUS_CODE, STATUS_LABEL, dayMonth, fullDate } from '../lib/format';
import s from './PostmarkTrail.module.css';

/**
 * The status history as a row of dated postmarks, oldest first. The latest is filled.
 * Rejected and withdrawn stamps print in red; a freshly made move stamps itself in (see `fresh`).
 */
export function PostmarkTrail({ history = [], fresh = false, compact = false }) {
  if (!history.length) return null;
  const label = history
    .map((h) => `${STATUS_LABEL[h.status]} on ${fullDate(h.changedAt)}`)
    .join(', then ');
  return (
    <ol
      className={`${s.trail} ${compact ? s.compact : ''}`}
      aria-label={`Status history: ${label}`}
    >
      {history.map((h, i) => {
        const last = i === history.length - 1;
        const cancelled = h.status === 'rejected' || h.status === 'withdrawn';
        return (
          <li key={`${h.status}-${h.changedAt}`} className={s.step} aria-hidden="true">
            {i > 0 && <span className={s.link} />}
            <span
              className={[s.mark, last && s.now, cancelled && s.cancelled, last && fresh && s.fresh]
                .filter(Boolean)
                .join(' ')}
              title={`${STATUS_LABEL[h.status]} · ${fullDate(h.changedAt)}`}
            >
              <span className={s.code}>{STATUS_CODE[h.status]}</span>
              <span className={s.date}>{dayMonth(h.changedAt).toUpperCase()}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
