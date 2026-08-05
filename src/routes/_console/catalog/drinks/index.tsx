import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/drinks/')({
  component: () => <PhasePlaceholder label="route.catalog.drinks" phase="catalog" />,
});
