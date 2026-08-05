import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/economy/')({
  component: () => <PhasePlaceholder label="route.balancing.economy" phase="balancing" />,
});
