import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/')({
  component: () => <PhasePlaceholder label="route.ops" phase="ops" />,
});
