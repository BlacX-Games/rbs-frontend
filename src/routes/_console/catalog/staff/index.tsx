import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/staff/')({
  component: () => <PhasePlaceholder label="route.catalog.staff" phase="catalog" />,
});
