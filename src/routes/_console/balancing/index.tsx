import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/')({
  component: () => <PhasePlaceholder label="route.balancing" phase="balancing" />,
});
