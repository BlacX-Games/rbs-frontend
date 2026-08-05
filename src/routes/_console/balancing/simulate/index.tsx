import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/simulate/')({
  component: () => <PhasePlaceholder label="route.balancing.simulate" phase="balancing" />,
});
