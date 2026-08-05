import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/players/')({
  component: () => <PhasePlaceholder label="route.ops.players" phase="ops" />,
});
