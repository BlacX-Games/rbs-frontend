import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/ambience/')({
  component: () => <PhasePlaceholder label="route.catalog.ambience" phase="catalog" />,
});
