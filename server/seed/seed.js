/* eslint-disable no-console */
/**
 * Demo data so reviewers can try the app immediately: one login per role, five companies,
 * about 50 jobs and a few dozen applications at every pipeline stage. All of it is fictional.
 * Run with `npm run seed` (wipes the configured database first).
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Company = require('../src/models/Company');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');

const DEMO_PASSWORD = 'Demo@1234';
const DAY = 24 * 60 * 60 * 1000;

// Deterministic pseudo-random so every seed run produces the same demo.
let state = 42;
const rand = () => (state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const pick = (list) => list[Math.floor(rand() * list.length)];
const daysAgo = (d, h = 10) => new Date(Date.now() - d * DAY - h * 60 * 60 * 1000);

const COMPANIES = [
  {
    name: 'Kestrel Labs',
    location: 'Bengaluru',
    website: 'https://kestrel.example.com',
    about: 'Hiring software for growing teams. Demo company.',
  },
  {
    name: 'Monsoon Pay',
    location: 'Mumbai',
    website: 'https://monsoonpay.example.com',
    about: 'UPI payments for small merchants. Demo company.',
  },
  {
    name: 'Ghat Logistics',
    location: 'Pune',
    website: 'https://ghat.example.com',
    about: 'Route planning for regional freight. Demo company.',
  },
  {
    name: 'Tamarind Health',
    location: 'Hyderabad',
    website: 'https://tamarind.example.com',
    about: 'Clinic records and appointments. Demo company.',
  },
  {
    name: 'Saffron Studio',
    location: 'Remote',
    website: 'https://saffron.example.com',
    about: 'Design and front-end agency. Demo company.',
  },
];

const ROLES = [
  {
    title: 'Frontend Engineer (React)',
    skills: ['react', 'typescript', 'css', 'html', 'javascript', 'testing'],
    exp: [2, 4],
    sal: [1200000, 1800000],
  },
  {
    title: 'Backend Engineer (Node.js)',
    skills: ['node.js', 'express', 'mongodb', 'rest', 'javascript'],
    exp: [2, 5],
    sal: [1400000, 2200000],
  },
  {
    title: 'Full-Stack Developer (MERN)',
    skills: ['react', 'node.js', 'mongodb', 'express', 'javascript'],
    exp: [1, 3],
    sal: [900000, 1500000],
  },
  {
    title: 'Data Analyst Intern',
    skills: ['sql', 'excel', 'python', 'statistics'],
    exp: [0, 1],
    sal: [240000, 360000],
    type: 'internship',
  },
  {
    title: 'QA Engineer',
    skills: ['testing', 'playwright', 'javascript', 'api testing'],
    exp: [1, 3],
    sal: [700000, 1100000],
  },
  {
    title: 'SDE I',
    skills: ['javascript', 'data structures', 'sql', 'git', 'react'],
    exp: [0, 2],
    sal: [800000, 1400000],
  },
  {
    title: 'DevOps Engineer',
    skills: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux'],
    exp: [3, 6],
    sal: [1800000, 2800000],
  },
  {
    title: 'Product Designer',
    skills: ['figma', 'ux research', 'prototyping', 'css'],
    exp: [2, 5],
    sal: [1100000, 1900000],
  },
  {
    title: 'Android Developer',
    skills: ['kotlin', 'android', 'jetpack compose', 'rest'],
    exp: [2, 4],
    sal: [1200000, 2000000],
  },
  {
    title: 'Python Developer',
    skills: ['python', 'django', 'postgresql', 'rest'],
    exp: [1, 4],
    sal: [900000, 1600000],
  },
  {
    title: 'Technical Writer (Contract)',
    skills: ['documentation', 'markdown', 'api docs'],
    exp: [1, 3],
    sal: [600000, 900000],
    type: 'contract',
  },
];

const SEEKER_NAMES = [
  'Ananya Rao',
  'Rohit Menon',
  'Farah Qureshi',
  'Vikram Iyer',
  'Sneha Kulkarni',
  'Arjun Das',
  'Meera Pillai',
  'Karan Malhotra',
  'Nisha Bose',
  'Rahul Verma',
  'Ishita Sen',
  'Aditya Joshi',
  'Priya Nair',
  'Siddharth Rawat',
  'Zoya Khan',
  'Harsh Patel',
  'Divya Reddy',
  'Manav Gill',
  'Tanvi Shah',
  'Kabir Singh',
];
const CITIES = [
  'Bengaluru',
  'Mumbai',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Delhi',
  'Kolkata',
  'Kochi',
  'Noida',
  'Ahmedabad',
];
const SKILL_POOL = [...new Set(ROLES.flatMap((r) => r.skills))];

function description(role, company) {
  return [
    `${company.name} is hiring a ${role.title} to join a small team that ships every week.`,
    '',
    'What you will do',
    `- Own features end to end, from design review to release`,
    `- Work daily with ${role.skills.slice(0, 3).join(', ')}`,
    '- Review pull requests and keep the test suite green',
    '',
    'What we look for',
    `- ${role.exp[0]}–${role.exp[1]} years of hands-on experience`,
    '- Clear written communication',
    '',
    'This is a demo listing created by the seed script.',
  ].join('\n');
}

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log(`Seeding ${env.mongoUri}`);
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
  ]);
  await mongoose.connection.syncIndexes();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await User.create({
    name: 'Admin Demo',
    email: 'admin@demo.hirethefire.dev',
    passwordHash,
    role: 'admin',
  });

  const recruiters = await User.insertMany(
    COMPANIES.map((c, i) => ({
      name: ['Neha Kapoor', 'Arvind Shetty', 'Pooja Deshmukh', 'Sameer Ali', 'Leela Thomas'][i],
      email: i === 0 ? 'recruiter@demo.hirethefire.dev' : `recruiter${i + 1}@demo.hirethefire.dev`,
      passwordHash,
      role: 'recruiter',
    })),
  );
  const companies = await Company.insertMany(
    COMPANIES.map((c, i) => ({ ...c, owner: recruiters[i]._id })),
  );
  await Promise.all(
    recruiters.map((r, i) => User.updateOne({ _id: r._id }, { company: companies[i]._id })),
  );

  const seekers = await User.insertMany(
    SEEKER_NAMES.map((name, i) => {
      const skills = [
        ...new Set([
          pick(SKILL_POOL),
          pick(SKILL_POOL),
          pick(SKILL_POOL),
          'javascript',
          i % 2 ? 'react' : 'sql',
        ]),
      ];
      return {
        name,
        email:
          i === 0
            ? 'seeker@demo.hirethefire.dev'
            : `${name.split(' ')[0].toLowerCase()}@demo.hirethefire.dev`,
        passwordHash,
        role: 'seeker',
        profile: {
          headline: `${pick(['Frontend', 'Full-stack', 'Backend', 'Data', 'QA'])} developer`,
          location: pick(CITIES),
          experienceYears: Math.floor(rand() * 6),
          skills: i === 0 ? ['react', 'typescript', 'css', 'html', 'javascript'] : skills,
          resumeUrl: '/demo/resume.pdf',
          links: { github: `https://github.com/${name.split(' ')[0].toLowerCase()}-demo` },
        },
        createdAt: daysAgo(40 - i),
      };
    }),
  );

  // ~50 jobs spread over the five companies; Kestrel Labs (the demo recruiter) gets the richest pipeline.
  const jobs = [];
  for (let i = 0; i < 50; i += 1) {
    const companyIdx = i < 14 ? 0 : 1 + (i % 4);
    const company = companies[companyIdx];
    const role = ROLES[i % ROLES.length];
    const posted = daysAgo(Math.floor(rand() * 45) + 1);
    const status = i % 13 === 5 ? 'draft' : i % 9 === 7 ? 'closed' : 'open';
    jobs.push({
      title: role.title,
      description: description(role, company),
      company: company._id,
      companyName: company.name,
      postedBy: recruiters[companyIdx]._id,
      location: company.location === 'Remote' ? pick(CITIES) : company.location,
      jobType: role.type || 'full-time',
      remote: company.location === 'Remote' || rand() < 0.2,
      experienceMin: role.exp[0],
      experienceMax: role.exp[1],
      salaryMin: role.sal[0],
      salaryMax: role.sal[1],
      skills: role.skills,
      status,
      publishedAt: status === 'draft' ? undefined : posted,
      createdAt: posted,
    });
  }
  const savedJobs = await Job.insertMany(jobs);

  // Applications with realistic histories: each step a day or two after the last.
  const PATHS = [
    ['applied'],
    ['applied'],
    ['applied', 'shortlisted'],
    ['applied', 'shortlisted', 'interview'],
    ['applied', 'shortlisted', 'interview', 'hired'],
    ['applied', 'rejected'],
    ['applied', 'shortlisted', 'rejected'],
    ['applied', 'withdrawn'],
  ];
  const apps = [];
  const counts = {};
  for (const job of savedJobs.filter((j) => j.status !== 'draft')) {
    const n =
      String(job.postedBy) === String(recruiters[0]._id)
        ? 6 + Math.floor(rand() * 8)
        : Math.floor(rand() * 5);
    const pool = [...seekers].sort(() => rand() - 0.5).slice(0, n);
    for (const seeker of pool) {
      const path = pick(PATHS);
      let t = Math.max(job.createdAt.getTime(), Date.now() - 28 * DAY) + rand() * 6 * DAY;
      const history = path.map((status) => {
        const at = new Date(Math.min(t, Date.now() - 60 * 60 * 1000));
        t += (1 + rand() * 2) * DAY;
        return {
          status,
          changedAt: at,
          changedBy: status === 'applied' || status === 'withdrawn' ? seeker._id : job.postedBy,
        };
      });
      apps.push({
        job: job._id,
        applicant: seeker._id,
        resumeUrl: seeker.profile.resumeUrl,
        coverNote: rand() < 0.5 ? 'I have shipped similar features and would like to talk.' : '',
        status: path.at(-1),
        history,
        recruiterNotes: path.includes('interview')
          ? 'Good system design answers. Check notice period.'
          : '',
        lastMovedAt: history.at(-1).changedAt,
        createdAt: history[0].changedAt,
      });
      counts[job._id] = (counts[job._id] || 0) + 1;
    }
  }
  await Application.insertMany(apps);
  await Promise.all(
    Object.entries(counts).map(([id, c]) => Job.updateOne({ _id: id }, { applicantCount: c })),
  );

  console.log(
    `Created ${seekers.length} seekers, ${recruiters.length} recruiters, 1 admin, ${savedJobs.length} jobs, ${apps.length} applications.`,
  );
  console.log(`Demo logins (password ${DEMO_PASSWORD}):`);
  console.log(
    '  seeker@demo.hirethefire.dev  recruiter@demo.hirethefire.dev  admin@demo.hirethefire.dev',
  );
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
