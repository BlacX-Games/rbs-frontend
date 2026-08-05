import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/tiers/')({
  component: () => <PhasePlaceholder label="route.balancing.tiers" phase="balancing" />,
});
