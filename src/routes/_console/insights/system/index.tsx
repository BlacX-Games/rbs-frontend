import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/system/')({
  component: () => <PhasePlaceholder label="route.insights.system" phase="insights1" />,
});
