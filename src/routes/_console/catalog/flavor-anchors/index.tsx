import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/catalog/flavor-anchors/')({
  component: () => <PhasePlaceholder label="route.catalog.flavorAnchors" phase="catalog" />,
});
