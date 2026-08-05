import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/dishes/$dishId')({
  component: () => <PhasePlaceholder label="route.catalog.dish" phase="catalog" />,
});
