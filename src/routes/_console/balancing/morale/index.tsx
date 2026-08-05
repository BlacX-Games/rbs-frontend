import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/morale/')({
  component: () => <PhasePlaceholder label="route.balancing.morale" phase="balancing" />,
});
