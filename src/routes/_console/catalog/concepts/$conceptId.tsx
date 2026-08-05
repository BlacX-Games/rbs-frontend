import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/concepts/$conceptId')({
  component: () => <PhasePlaceholder label="route.catalog.concept" phase="catalog" />,
});
