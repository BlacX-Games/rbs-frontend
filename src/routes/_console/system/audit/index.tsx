import { createFileRoute } from '@tanstack/react-router';
import { PhasePlaceholder } from '@/app/PhasePlaceholder';

export const Route = createFileRoute('/_console/system/audit/')({
  component: () => <PhasePlaceholder label="route.system.audit" phase="backend" />,
});
