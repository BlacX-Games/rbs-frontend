import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/starter-kits/')({
  component: () => <PhasePlaceholder label="route.catalog.starterKits" phase="catalog" />,
});
