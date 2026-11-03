import { Bookmark, BookmarkX } from 'lucide-react';
import { usersApi } from '../../api';
import { useAuth, useFetch } from '../../hooks';
import { JobCard } from '../../components/JobCard';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import p from '../pages.module.css';

export default function Saved() {
  const { user, setUser } = useAuth();
  const saved = useFetch(() => usersApi.saved(), []);

  const unsave = async (id) => {
    await usersApi.unsave(id);
    saved.setData((list) => list.filter((j) => j._id !== id));
    setUser({ ...user, savedJobs: user.savedJobs.filter((x) => x !== id) });
  };

  return (
    <div className={p.page}>
      <PageHeader title="Saved jobs" meta="Jobs you bookmarked. Closed ones stay here, marked." />
      {saved.loading && !saved.data && <Skeleton rows={4} height={110} />}
      {saved.error && <ErrorState error={saved.error} onRetry={saved.reload} />}
      {saved.data?.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs"
          action={<Button to="/jobs">Browse jobs</Button>}
        >
          Use Save for later on any job to keep it here.
        </EmptyState>
      )}
      {saved.data?.length > 0 && (
        <div className={p.list}>
          {saved.data.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              aside={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={BookmarkX}
                  onClick={() => unsave(job._id)}
                  aria-label={`Remove ${job.title} from saved`}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
