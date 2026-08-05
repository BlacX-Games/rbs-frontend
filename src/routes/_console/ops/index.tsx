import { createFileRoute } from '@tanstack/react-router';
import { OpsHome } from '@/features/ops/OpsHome';

export const Route = createFileRoute('/_console/ops/')({
  component: OpsHome,
});
