import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from '@/components/primitives/Breadcrumb';
import { Pagination } from '@/components/primitives/Pagination';
import { Tabs } from '@/components/primitives/Tabs';
import { renderWithProviders } from '../../../support/render';

const TABS = [
  { value: 'overview', label: 'Overview', content: <p>Overview panel</p> },
  { value: 'menu', label: 'Menu', content: <p>Menu panel</p> },
  { value: 'staff', label: 'Staff', content: <p>Staff panel</p> },
] as const;

describe('<Tabs />', () => {
  it('shows only the selected panel', () => {
    renderWithProviders(<Tabs defaultValue="overview" items={TABS} label="Restaurant sections" />);

    expect(screen.getByText('Overview panel')).toBeVisible();
    expect(screen.queryByText('Menu panel')).not.toBeInTheDocument();
  });

  it('is one tab stop, with arrows moving between tabs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Tabs defaultValue="overview" items={TABS} label="Restaurant sections" />);

    await user.tab();
    await user.keyboard('{ArrowRight}');

    // Automatic activation: the panel follows focus, so arrowing through
    // already-loaded sections costs no extra keypress.
    expect(screen.getByRole('tab', { name: 'Menu', selected: true })).toBeVisible();
    expect(screen.getByText('Menu panel')).toBeVisible();
  });

  it('names the tab list so the choice has a subject', () => {
    renderWithProviders(<Tabs defaultValue="overview" items={TABS} label="Restaurant sections" />);

    // Without a name the tabs announce as three bare labels with no indication
    // of what they divide.
    expect(screen.getByRole('tablist', { name: 'Restaurant sections' })).toBeVisible();
  });

  it('reports the change to a controlled parent', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <Tabs
        items={TABS}
        label="Restaurant sections"
        onValueChange={onValueChange}
        value="overview"
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Staff' }));

    expect(onValueChange).toHaveBeenCalledWith('staff');
  });
});

describe('<Breadcrumb />', () => {
  const CRUMBS = [
    { label: 'Live Ops', href: '/ops' },
    { label: 'Restaurants', href: '/ops/restaurants' },
    { label: 'The Ember Room' },
  ] as const;

  it('marks the final crumb as the current page', () => {
    renderWithProviders(<Breadcrumb items={CRUMBS} label="Breadcrumb" />);

    // aria-current is the "you are here". Without it the trail describes a path
    // and never says which end of it you are standing on.
    expect(screen.getByText('The Ember Room')).toHaveAttribute('aria-current', 'page');
  });

  it('does not link the page to itself', () => {
    renderWithProviders(<Breadcrumb items={CRUMBS} label="Breadcrumb" />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'The Ember Room' })).not.toBeInTheDocument();
  });

  it('is a labelled navigation landmark', () => {
    renderWithProviders(<Breadcrumb items={CRUMBS} label="Breadcrumb" />);

    // A page carries several navs — rail, breadcrumb, pagination — so each
    // needs a name to be tellable apart in a landmark list.
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  });
});

describe('<Pagination />', () => {
  const PROPS = {
    label: 'Sessions pages',
    previousLabel: 'Previous',
    nextLabel: 'Next',
    rangeLabel: '1–50 of 1,204',
    onPrevious: () => undefined,
    onNext: () => undefined,
  };

  it('announces the range as a live region', () => {
    renderWithProviders(<Pagination {...PROPS} hasNext hasPrevious={false} />);

    // §5.6 asks for a live region on async results. Paging is one: without it
    // an operator presses Next and the table silently becomes different rows.
    expect(screen.getByText('1–50 of 1,204')).toHaveAttribute('aria-live', 'polite');
  });

  it('disables the direction it cannot go', () => {
    renderWithProviders(<Pagination {...PROPS} hasNext hasPrevious={false} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('offers no numbered pages, because cursors cannot jump', () => {
    renderWithProviders(<Pagination {...PROPS} hasNext hasPrevious />);

    // The admin read plane is cursor-paginated (§8.4), so "go to page 7" has no
    // offset to go to. Two buttons and a readout is the honest surface; a
    // numbered strip would be a control that looks like it works.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('moves on click', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithProviders(<Pagination {...PROPS} hasNext hasPrevious onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
