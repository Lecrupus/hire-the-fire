import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MailX } from 'lucide-react';
import { Shell } from './components/Shell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Button, EmptyState, Skeleton } from './components/ui';
import Home from './pages/Home';
import JobSearch from './pages/JobSearch';
import JobDetail from './pages/JobDetail';
import { Login, Register } from './pages/Auth';

// Role-specific areas load on demand so seekers never download the recruiter code.
const Profile = lazy(() => import('./pages/seeker/Profile'));
const MyApplications = lazy(() => import('./pages/seeker/MyApplications'));
const Saved = lazy(() => import('./pages/seeker/Saved'));
const Dashboard = lazy(() => import('./pages/recruiter/Dashboard'));
const MyJobs = lazy(() => import('./pages/recruiter/MyJobs'));
const JobForm = lazy(() => import('./pages/recruiter/JobForm'));
const Pipeline = lazy(() => import('./pages/recruiter/Pipeline'));
const Company = lazy(() => import('./pages/recruiter/Company'));
const Admin = lazy(() => import('./pages/admin/Admin'));

function NotFound() {
  return (
    <EmptyState
      icon={MailX}
      title="Return to sender"
      action={<Button to="/">Go to the home page</Button>}
    >
      There is no page at this address. It may have moved, or the link has a typo.
    </EmptyState>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Skeleton rows={3} />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="jobs" element={<JobSearch />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          <Route element={<ProtectedRoute roles={['seeker']} />}>
            <Route path="profile" element={<Profile />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="saved" element={<Saved />} />
          </Route>

          <Route path="recruiter" element={<ProtectedRoute roles={['recruiter']} />}>
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<MyJobs />} />
            <Route path="jobs/new" element={<JobForm />} />
            <Route path="jobs/:id/edit" element={<JobForm />} />
            <Route path="jobs/:id/applicants" element={<Pipeline />} />
            <Route path="company" element={<Company />} />
          </Route>

          <Route path="admin" element={<ProtectedRoute roles={['admin']} />}>
            <Route index element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
