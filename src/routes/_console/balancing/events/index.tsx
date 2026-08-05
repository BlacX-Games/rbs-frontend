import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/balancing/events/')({
  component: () => <PhasePlaceholder label="route.balancing.events" phase="balancing" />,
});
