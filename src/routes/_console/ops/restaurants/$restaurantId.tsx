import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/ops/restaurants/$restaurantId')({
  component: () => <PhasePlaceholder label="route.ops.restaurant" phase="ops" />,
});
