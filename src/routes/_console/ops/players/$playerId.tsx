import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/players/$playerId')({
  component: () => <PhasePlaceholder label="route.ops.player" phase="ops" />,
});
