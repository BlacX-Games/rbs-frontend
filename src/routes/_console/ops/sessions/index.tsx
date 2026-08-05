import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/sessions/')({
  component: () => <PhasePlaceholder label="route.ops.sessions" phase="ops" />,
});
