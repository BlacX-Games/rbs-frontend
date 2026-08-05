import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/dishes/')({
  component: () => <PhasePlaceholder label="route.catalog.dishes" phase="catalog" />,
});
