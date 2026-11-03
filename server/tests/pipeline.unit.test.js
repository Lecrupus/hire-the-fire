const { canMove, canWithdraw, skillMatch, buildJobFilter } = require('../src/services/pipeline');

describe('status transition rules', () => {
  test.each([
    ['applied', 'shortlisted', true],
    ['applied', 'rejected', true],
    ['shortlisted', 'interview', true],
    ['interview', 'hired', true],
    ['rejected', 'hired', false],
    ['hired', 'rejected', false],
    ['applied', 'hired', false],
    ['withdrawn', 'shortlisted', false],
  ])('%s -> %s is %s', (from, to, ok) => expect(canMove(from, to)).toBe(ok));

  test('withdraw is allowed only while the application is in progress', () => {
    expect(canWithdraw('applied')).toBe(true);
    expect(canWithdraw('interview')).toBe(true);
    expect(canWithdraw('hired')).toBe(false);
    expect(canWithdraw('rejected')).toBe(false);
  });
});

describe('skill match scoring', () => {
  test('counts shared skills case-insensitively', () => {
    expect(skillMatch(['React', 'Node.js'], ['react', 'typescript', 'node.js'])).toEqual({
      matched: 2,
      total: 3,
      skills: ['react', 'node.js'],
    });
  });

  test('handles empty lists', () => {
    expect(skillMatch(undefined, ['react'])).toEqual({ matched: 0, total: 1, skills: [] });
  });
});

describe('job search filter builder', () => {
  test('only open jobs by default', () => {
    expect(buildJobFilter({})).toEqual({ status: 'open' });
  });

  test('salary filters overlap ranges', () => {
    const f = buildJobFilter({ salaryMin: 1000000, salaryMax: 2000000 });
    expect(f.salaryMax).toEqual({ $gte: 1000000 });
    expect(f.salaryMin).toEqual({ $lte: 2000000 });
  });

  test('escapes regex characters in location', () => {
    expect(buildJobFilter({ location: 'a.b' }).location.$regex).toBe('a\\.b');
  });

  test('experience matches open-ended jobs', () => {
    const f = buildJobFilter({ experience: 3 });
    expect(f.experienceMin).toEqual({ $lte: 3 });
    expect(f.$or).toHaveLength(2);
  });

  test('remote false is kept as a filter', () => {
    expect(buildJobFilter({ remote: false }).remote).toBe(false);
  });
});
