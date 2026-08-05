import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/versions/')({
  component: () => <PhasePlaceholder label="route.balancing.versions" phase="balancing" />,
});
