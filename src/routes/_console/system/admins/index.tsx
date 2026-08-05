import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/system/admins/')({
  component: () => <PhasePlaceholder label="route.system.admins" phase="backend" />,
});
