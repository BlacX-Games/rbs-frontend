/**
 * The message catalogue. Every user-visible string in the console lives here.
 *
 * ── Why a plain object and not a library ────────────────────────────────────
 * `10_QA_Loc_Legal.md` requires externalized strings from day one, because
 * retrofitting them is what makes localization expensive. It does not require a
 * runtime: with one locale, `react-i18next` buys lazy loading and a plural
 * engine we would not use, and costs a provider plus declaration merging to get
 * key typing that a literal object gives for free.
 *
 * What this shape *does* buy, and a library does not without extra wiring:
 * `t()` checks the key **and** its interpolation parameters at compile time
 * (see `t.ts`). A typo'd key is a build error, and so is a message that needs
 * `{count}` called without one.
 *
 * When a second locale is funded this becomes `en` beside `de`, and the swap to
 * a library — if one is still wanted — changes `t.ts` and nothing else, because
 * no component imports this file directly.
 *
 * ── Conventions ─────────────────────────────────────────────────────────────
 * • Keys are `area.thing.detail`, sorted by area, so the catalogue reads as an
 *   outline of the product and a missing screen is visible as a missing block.
 * • Interpolation is `{name}` — no formatting syntax. A number that needs
 *   grouping, a date that needs a locale, or money that needs exactness is
 *   formatted by `format.ts` *before* it is passed in, so the catalogue never
 *   encodes a formatting decision a translator would have to preserve.
 * • Every `error.*` key is named for a `code` the backend actually emits. The
 *   list is closed by `api/errors.ts`, which fails to compile if a code it maps
 *   has no message here.
 */

export const en = {
  /* ── Product chrome ─────────────────────────────────────────────────── */
  'app.name': 'Operator Console',
  'app.product': "Declan's Restaurant & Bar Simulator",
  'app.skipToContent': 'Skip to content',
  'app.credit': 'Original concept by Declan Struthers.',

  /* ── Navigation (§4) ────────────────────────────────────────────────── */
  'nav.label': 'Main',
  'nav.expand': 'Expand navigation',
  'nav.collapse': 'Collapse navigation',
  'nav.breadcrumb': 'Breadcrumb',
  'nav.insights': 'Insights',
  'nav.ops': 'Live Ops',
  'nav.catalog': 'Catalog',
  'nav.balancing': 'Balancing',
  'nav.system': 'System',
  'nav.design': 'Design system',

  /* ── Top bar ────────────────────────────────────────────────────────── */
  'topbar.label': 'Console controls',
  'topbar.account': 'Account',
  'topbar.signOut': 'Sign out',
  'topbar.signedInAs': 'Signed in as {name}',
  'topbar.environment': 'Environment: {environment}',
  'topbar.environment.local': 'Local',
  'topbar.environment.staging': 'Staging',
  'topbar.environment.production': 'Production',
  'topbar.mockData': 'Mock data',
  'topbar.mockData.detail': 'This console is reading the mock network, not a backend.',

  /* ── Command palette (⌘K) ───────────────────────────────────────────── */
  'palette.open': 'Search and commands',
  'palette.label': 'Search and commands',
  'palette.placeholder': 'Go to a screen, or type a command…',
  'palette.empty': 'Nothing matches that.',
  'palette.group.goTo': 'Go to',

  /* ── Sign-in ────────────────────────────────────────────────────────── */
  'signin.title': 'Sign in',
  'signin.subtitle': 'Operator access to the {product} console.',
  'signin.email': 'Email',
  'signin.password': 'Password',
  'signin.submit': 'Sign in',
  'signin.showPassword': 'Show password',
  'signin.hidePassword': 'Hide password',
  'signin.submitting': 'Signing in…',
  'signin.invalid': 'That email and password do not match an operator account.',
  'signin.emailRequired': 'Enter your email.',
  'signin.passwordRequired': 'Enter your password.',
  'signin.mockRoster': 'Mock accounts',
  'signin.mockRoster.detail':
    'The backend has no admin API yet, so these five accounts are served by the mock network. Password for all of them: {password}',
  'signin.redirected': 'Sign in to continue to {destination}.',

  /* ── Shared actions ─────────────────────────────────────────────────── */
  'action.retry': 'Try again',
  'action.cancel': 'Cancel',
  'action.close': 'Close',
  'action.clearFilters': 'Clear filters',
  'action.exportCsv': 'Export CSV',
  'action.columns': 'Columns',
  'action.copy': 'Copy',
  'action.copied': 'Copied',
  'action.viewDetail': 'View detail',
  'action.previous': 'Previous',
  'action.next': 'Next',

  /* ── Shared states ──────────────────────────────────────────────────── */
  'state.loading': 'Loading…',
  'state.empty.title': 'Nothing here yet',
  'state.empty.description': 'Nothing matches the current filters. Widen them, or clear them.',
  'state.error.title': 'That did not load',
  'state.error.description': '{message}',
  'state.forbidden.title': 'You do not have access to this',
  'state.forbidden.description':
    'This screen needs a role your account does not hold. Ask an owner if you need it.',
  'state.notFound.title': 'No such screen',
  'state.notFound.description': 'That URL does not match anything in this console.',
  'state.crash.title': 'This screen stopped working',
  'state.crash.description':
    'Something in the console failed rather than the data behind it. Reloading usually clears it; tell an engineer if it does not.',

  /* ── Phase placeholders ─────────────────────────────────────────────── */
  'state.phase.title': 'Not built yet',
  'state.phase.route': '{screen} arrives in {phase}.',
  'state.phase.ops': 'Phase 5 — Live Ops',
  'state.phase.catalog': 'Phase 6 — Content Catalog',
  'state.phase.balancing': 'Phase 7 — Balancing & Formula Studio',
  'state.phase.insights1': 'Phase 8 — Insights, stage 1',
  'state.phase.insights2': 'Phase 9 — Insights, stage 2',
  'state.phase.backend': 'the backend admin phases',
  'state.phase.blocked':
    'This one is also gated on data the backend has not built yet — there is no telemetry or AI-cost table to read.',
  'state.phase.backendNote':
    'rbs-backend has no admin API yet, so this screen has nothing to read until it does.',

  /* ── Pagination ─────────────────────────────────────────────────────── */
  'pagination.label': 'Pagination',
  'pagination.range': '{from}–{to} of {total}',
  'pagination.rangeUnknown': '{from}–{to}',

  /* ── Notifications ──────────────────────────────────────────────────── */
  'toast.viewport': 'Notifications',
  'toast.dismiss': 'Dismiss notification',

  /* ── Theme and density ──────────────────────────────────────────────── */
  'theme.label': 'Theme',
  'theme.dark': 'Dark',
  'theme.light': 'Paper',
  'theme.system': 'System',
  'density.label': 'Density',
  'density.comfortable': 'Comfortable',
  'density.compact': 'Compact',

  /* ── Decision flags (golden rule 5) ─────────────────────────────────── */
  'decision.label': 'Needs decision',
  'decision.detail': 'This value is unresolved in the design docs — do not treat it as settled.',

  /* ── Live Ops — home (§6.1) ─────────────────────────────────────────── */
  'ops.home.title': "Today's activity",
  'ops.home.asOf': 'As of {time}',
  'ops.home.source': 'Counted over services dated today, in UTC.',
  'ops.stat.sessions': 'Services run',
  'ops.stat.covers': 'Covers served',
  'ops.stat.revenue': 'Revenue',
  'ops.stat.satisfaction': 'Average satisfaction',
  'ops.stat.moderation': 'Reviews awaiting moderation',
  'ops.stat.noServices': 'No services ran today, so there is nothing to average.',

  'ops.alerts.title': 'Needs attention',
  'ops.alerts.label': 'Anomalies',
  'ops.alerts.none.title': 'Nothing looks wrong',
  'ops.alerts.none.description':
    'No service lost money, failed an inspection, or left staff burnt out today.',
  'ops.alert.negativeProfit': '{restaurant} lost {amount} on a service.',
  'ops.alert.failedInspection': '{restaurant} recorded a health inspection result of “{result}”.',
  'ops.alert.burntOutStaff': '{restaurant} has {count} staff in the burnt-out morale band.',
  'ops.alert.view': 'Open the service',

  'ops.recent.title': 'Recent services',
  'ops.recent.caption': 'The eight most recent services across every restaurant',
  'ops.recent.empty': 'No services have been run yet.',

  /* ── Live Ops — players (§6.1) ──────────────────────────────────────── */
  'ops.players.title': 'Players',
  'ops.players.caption': 'Player accounts',
  'ops.players.filters': 'Player filters',
  'ops.players.search': 'Search',
  'ops.players.searchPlaceholder': 'Username, email, or ID',
  'ops.players.provider': 'Identity provider',
  'ops.players.providerAny': 'Any provider',
  'ops.players.ageBracket': 'Age bracket',
  'ops.players.ageBracketAny': 'Any bracket',
  'ops.players.activity': 'Active within',
  'ops.players.activityAny': 'Any time',
  'ops.players.activity7': 'Last 7 days',
  'ops.players.activity30': 'Last 30 days',
  'ops.players.activity90': 'Last 90 days',
  'ops.players.owns': 'Restaurants',
  'ops.players.ownsAny': 'Any',
  'ops.players.ownsYes': 'Has restaurants',
  'ops.players.ownsNo': 'No restaurants',
  'ops.players.empty.title': 'No players match',
  'ops.players.empty.description': 'Widen the filters, or clear them to see every account.',

  'ops.player.id': 'ID',
  'ops.player.username': 'Username',
  'ops.player.email': 'Email',
  'ops.player.anonymous': 'Anonymous',
  'ops.player.noEmail': 'No email — anonymous device play',
  'ops.player.emailHidden': 'Hidden',
  'ops.player.emailReveal': 'Reveal email for {player}',
  'ops.player.emailRestricted': 'Your role cannot see player email addresses.',
  'ops.player.providers': 'Identities',
  'ops.player.restaurantCount': 'Restaurants',
  'ops.player.createdAt': 'Created',
  'ops.player.lastActive': 'Last active',
  'ops.player.role': 'Role',
  'ops.player.aiTier': 'AI tier',
  'ops.player.copyId': 'Copy ID for {player}',

  /* ── Live Ops — player detail (§6.1) ────────────────────────────────── */
  'ops.player.detail.identity': 'Identity',
  'ops.player.detail.identityCaption': 'Linked sign-in methods',
  'ops.player.detail.linkedAt': 'Linked',
  'ops.player.detail.lastUsed': 'Last used',
  'ops.player.detail.restaurants': 'Restaurants',
  'ops.player.detail.noRestaurants': 'This player has not opened a restaurant.',
  'ops.player.detail.reputation': 'Reputation',
  'ops.player.detail.revenue': 'Lifetime revenue',
  'ops.player.detail.services': 'Services run',
  'ops.player.detail.activity': 'Recent services',
  'ops.player.detail.activitySummary': 'Revenue across the last {count} services',
  'ops.player.detail.noActivity': 'No services yet, so there is no trend to draw.',
  'ops.player.detail.actions': 'Actions',
  'ops.player.detail.export': 'Export account',
  'ops.player.detail.delete': 'Delete account',
  'ops.player.detail.changeRole': 'Change role',
  'ops.player.detail.actionsPending':
    'These write to a player account, so they arrive with Phase 5 — once every one of them lands in the audit trail (golden rule 7).',
  'ops.player.detail.audit': 'Audit trail',
  'ops.player.detail.auditCaption': 'Everything done to this account',
  'ops.player.detail.auditEmpty': 'Nothing has been done to this account.',
  'ops.player.detail.back': 'Back to players',
  'ops.player.detail.peekTitle': 'Player {player}',
  'ops.player.detail.openFull': 'Open the full record',

  /* ── Route labels (§4) ──────────────────────────────────────────────── */
  'route.insights': 'Overview',
  'route.insights.economy': 'Economy',
  'route.insights.progression': 'Progression',
  'route.insights.content': 'Content performance',
  'route.insights.system': 'System health',
  'route.insights.moments': 'Emotional moments',
  'route.insights.aiCost': 'AI cost',

  'route.ops': 'Today',
  'route.ops.players': 'Players',
  'route.ops.player': 'Player',
  'route.ops.restaurants': 'Restaurants',
  'route.ops.restaurant': 'Restaurant',
  'route.ops.sessions': 'Services',
  'route.ops.session': 'Service',
  'route.ops.reviews': 'Reviews',

  'route.catalog': 'Catalog home',
  'route.catalog.concepts': 'Concepts',
  'route.catalog.concept': 'Concept',
  'route.catalog.dishes': 'Dishes',
  'route.catalog.dish': 'Dish',
  'route.catalog.drinks': 'Drinks',
  'route.catalog.drink': 'Drink',
  'route.catalog.staff': 'Staff templates',
  'route.catalog.ambience': 'Ambience presets',
  'route.catalog.flavorAnchors': 'Flavour anchors',
  'route.catalog.starterKits': 'Starter kits',
  'route.catalog.export': 'Export',

  'route.balancing': 'Studio',
  'route.balancing.tiers': 'Tiers',
  'route.balancing.reputation': 'Reputation',
  'route.balancing.morale': 'Morale',
  'route.balancing.events': 'Events',
  'route.balancing.economy': 'Economy targets',
  'route.balancing.tune': 'Tune register',
  'route.balancing.simulate': 'Simulate',
  'route.balancing.versions': 'Versions',

  'route.system.audit': 'Audit trail',
  'route.system.admins': 'Operators',
  'route.system.settings': 'Settings',

  'route.design': 'Design system',

  /* ── Error codes the backend actually emits ─────────────────────────── */
  'error.unknown': 'Something went wrong. Try again, and tell an engineer if it repeats.',
  'error.network': 'Could not reach the server. Check your connection and try again.',
  'error.VALIDATION_ERROR': 'Some of what you entered is not valid.',
  'error.UNAUTHENTICATED': 'You are not signed in.',
  'error.INVALID_TOKEN': 'Your session is no longer valid. Sign in again.',
  'error.TOKEN_EXPIRED': 'Your session expired. Sign in again.',
  'error.INVALID_CREDENTIALS': 'That email and password do not match an operator account.',
  'error.INVALID_REFRESH_TOKEN': 'Your session could not be renewed. Sign in again.',
  'error.REFRESH_TOKEN_EXPIRED': 'Your session expired. Sign in again.',
  'error.REFRESH_REUSE_DETECTED':
    'This session was signed out for safety because its credentials were reused. Sign in again.',
  'error.FORBIDDEN': 'Your role does not allow that.',
  'error.AGE_RESTRICTED': 'That account is age-restricted and cannot be changed this way.',
  'error.PLAYER_NOT_FOUND': 'That player no longer exists.',
  'error.EMAIL_TAKEN': 'That email is already in use.',
  'error.ALREADY_LINKED': 'That identity is already linked to this account.',
  'error.IDENTITY_IN_USE': 'That identity belongs to another account.',
  'error.NOT_FOUND': 'That does not exist, or has been deleted.',
  'error.RATE_LIMITED': 'Too many requests. Try again in {seconds}s.',
  'error.RATE_LIMITED.noCountdown': 'Too many requests. Try again shortly.',
  'error.SERVER': 'The server had a problem. This is not something you did.',
} as const;

export type Messages = typeof en;
