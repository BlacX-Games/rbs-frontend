import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/content/')({
  component: () => <PhasePlaceholder label="route.insights.content" phase="insights1" />,
});
