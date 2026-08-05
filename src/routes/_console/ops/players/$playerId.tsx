import { createFileRoute } from '@tanstack/react-router';
import { PlayerDetail } from '@/features/ops/PlayerDetail';

export const Route = createFileRoute('/_console/ops/players/$playerId')({
  component: PlayerDetailRoute,
});

function PlayerDetailRoute() {
  const { playerId } = Route.useParams();

  return <PlayerDetail playerId={playerId} />;
}
