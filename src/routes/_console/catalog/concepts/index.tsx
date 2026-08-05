import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/concepts/')({
  component: () => <PhasePlaceholder label="route.catalog.concepts" phase="catalog" />,
});
