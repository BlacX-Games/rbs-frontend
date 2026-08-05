import { createFileRoute } from '@tanstack/react-router';
import { PlayersScreen } from '@/features/ops/PlayersScreen';
import { PlayersSearchSchema, type PlayersSearch } from '@/features/ops/players-search';

/**
 * `/ops/players`.
 *
 * `validateSearch` is where §4's "any filtered view is a link" becomes true:
 * the URL is parsed into a typed object at the route boundary, so the screen
 * below never sees a malformed filter and never has to guess what a missing one
 * meant.
 */
export const Route = createFileRoute('/_console/ops/players/')({
  validateSearch: PlayersSearchSchema,
  component: PlayersRoute,
});

function PlayersRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <PlayersScreen
      onSearchChange={(next: Partial<PlayersSearch>) => {
        void navigate({
          // Merged, not replaced: changing a filter must not drop the sort, and
          // opening the peek must not drop the filters.
          search: (current) => ({ ...current, ...next }),
          // A filter keystroke is not a place in history. Without `replace`, an
          // operator who typed six characters into the search box would press
          // Back six times to leave the screen.
          replace: true,
        });
      }}
      search={search}
    />
  );
}
