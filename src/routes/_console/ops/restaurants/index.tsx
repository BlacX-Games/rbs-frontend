import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/restaurants/')({
  component: () => <PhasePlaceholder label="route.ops.restaurants" phase="ops" />,
});
