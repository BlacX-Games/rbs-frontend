import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/insights/ai-cost/')({
  component: () => <PhasePlaceholder label="route.insights.aiCost" phase="insights2" />,
});
