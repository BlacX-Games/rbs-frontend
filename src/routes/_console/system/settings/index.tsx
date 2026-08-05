import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/system/settings/')({
  component: () => <PhasePlaceholder label="route.system.settings" phase="backend" />,
});
