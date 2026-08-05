import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/moments/')({
  component: () => <PhasePlaceholder label="route.insights.moments" phase="insights2" />,
});
