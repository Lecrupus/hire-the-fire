import s from './StageStrip.module.css';

export const STAGES = [
  ['applied', 'Applied'],
  ['shortlisted', 'Shortlisted'],
  ['interview', 'Interview'],
  ['hired', 'Hired'],
  ['rejected', 'Rejected'],
];

/**
 * Pipeline stages with counts and a bar sized by each stage's share of all applicants.
 * With `onSelect` it is a tab list that filters the table below; without, a read-only summary.
 */
export function StageStrip({
  counts = {},
  active,
  onSelect,
  includeAll = true,
  label = 'Pipeline stages',
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const cells = includeAll ? [...STAGES, ['all', 'All']] : STAGES;
  const Tag = onSelect ? 'button' : 'div';

  return (
    <div
      className={s.strip}
      role={onSelect ? 'tablist' : 'list'}
      aria-label={label}
      style={{ '--cells': cells.length }}
    >
      {cells.map(([key, name]) => {
        const n = key === 'all' ? total : counts[key] || 0;
        const share = total ? (n / total) * 100 : 0;
        const on = active === key;
        return (
          <Tag
            key={key}
            type={onSelect ? 'button' : undefined}
            role={onSelect ? 'tab' : 'listitem'}
            aria-selected={onSelect ? on : undefined}
            className={`${s.cell} ${on ? s.on : ''} ${onSelect ? s.clickable : ''}`}
            onClick={onSelect ? () => onSelect(key) : undefined}
          >
            <span className={s.name}>{name}</span>
            <strong className={s.count}>{n}</strong>
            <span className={s.bar} aria-hidden="true">
              <i style={{ width: `${Math.max(share, n ? 3 : 0)}%` }} />
            </span>
            <span className="visually-hidden">{Math.round(share)}% of applicants</span>
          </Tag>
        );
      })}
    </div>
  );
}
