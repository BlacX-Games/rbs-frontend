import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/reviews/')({
  component: () => <PhasePlaceholder label="route.ops.reviews" phase="ops" />,
});
