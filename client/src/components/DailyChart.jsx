import { useState } from 'react';
import { dayMonth, fullDate } from '../lib/format';
import s from './DailyChart.module.css';

const W = 720;
const H = 200;
const PAD = { top: 22, right: 8, bottom: 26, left: 32 };

/** Rounds the axis max up to a clean number with 2 ticks. */
function niceMax(v) {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

/** Column with a 4px rounded data-end and a square base. */
function column(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Applications received per day. One series, so no legend: the heading names it.
 * Hover or focus a day for its count; the peak is labelled; a table view carries every value.
 */
export function DailyChart({ days }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...days.map((d) => d.count), 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / days.length;
  const barW = Math.min(16, band - 2);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const peak = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);
  const total = days.reduce((a, d) => a + d.count, 0);

  return (
    <figure className={s.figure}>
      <div className={s.plot}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Applications per day over the last 30 days, ${total} in total, peak ${days[peak].count} on ${fullDate(days[peak].date)}`}
        >
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? s.base : s.grid}
              />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={s.tick}>
                {t}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const h = (d.count / max) * innerH;
            return (
              <g
                key={d.date}
                tabIndex={0}
                className={s.day}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${fullDate(d.date)}: ${d.count} applications`}
              >
                <rect
                  x={PAD.left + i * band}
                  y={PAD.top}
                  width={band}
                  height={innerH}
                  className={s.hit}
                />
                {d.count > 0 && (
                  <path
                    d={column(x, y(d.count), barW, h)}
                    className={`${s.bar} ${hover === i ? s.barOn : ''}`}
                  />
                )}
                {i === peak && d.count > 0 && hover === null && (
                  <text x={x + barW / 2} y={y(d.count) - 6} textAnchor="middle" className={s.label}>
                    {d.count}
                  </text>
                )}
              </g>
            );
          })}
          {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + i * band + band / 2}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}
              className={s.tick}
            >
              {dayMonth(days[i].date)}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div
            className={s.tip}
            style={{ left: `${((PAD.left + hover * band + band / 2) / W) * 100}%` }}
            role="status"
          >
            <strong>{days[hover].count}</strong>{' '}
            {days[hover].count === 1 ? 'application' : 'applications'}
            <span>{fullDate(days[hover].date)}</span>
          </div>
        )}
      </div>
      <details className={s.table}>
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Applications</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>{fullDate(d.date)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
