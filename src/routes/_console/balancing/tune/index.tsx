import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/tune/')({
  component: () => <PhasePlaceholder label="route.balancing.tune" phase="balancing" />,
});
