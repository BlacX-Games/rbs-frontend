import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/')({
  component: () => <PhasePlaceholder label="route.insights" phase="insights1" />,
});
