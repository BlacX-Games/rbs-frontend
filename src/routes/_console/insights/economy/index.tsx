import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/economy/')({
  component: () => <PhasePlaceholder label="route.insights.economy" phase="insights1" />,
});
