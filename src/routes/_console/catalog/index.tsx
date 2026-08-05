import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/')({
  component: () => <PhasePlaceholder label="route.catalog" phase="catalog" />,
});
