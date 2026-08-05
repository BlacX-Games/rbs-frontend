import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/progression/')({
  component: () => <PhasePlaceholder label="route.insights.progression" phase="insights1" />,
});
