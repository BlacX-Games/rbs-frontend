import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { renderWithProviders } from '../support/render';

/**
 * The stage 1 shell. Thin on purpose — its job is to prove the design system is
 * actually wired into a rendered tree, not to test the components themselves.
 * Exhaustive per-component coverage arrives with the `/design` gallery.
 */
describe('<App />', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
  });

  it('renders the console shell', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operator Console' })).toBeVisible();
  });

  it('exposes theme and density as labelled, keyboard-reachable groups', () => {
    renderWithProviders(<App />);

    // `radiogroup`, not `group`: a single-select ToggleGroup is a radio set,
    // which is what gives it one tab stop and arrow-key movement inside.
    // §5.6 requires both to be operable without a mouse and announced by name;
    // an icon-only control with no accessible name is the usual failure here.
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeVisible();
  });

  it('stamps the stored preferences onto <html> so tokens.css can resolve them', () => {
    renderWithProviders(<App />, { theme: 'light', density: 'compact' });

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).toHaveAttribute('data-density', 'compact');
  });

  it('switches theme on click and persists the choice', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { theme: 'dark' });

    await user.click(screen.getByRole('radio', { name: 'Paper' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    // Persisted, or the operator re-picks it on every cold load.
    expect(localStorage.getItem('rbs.theme')).toBe('light');
  });
});
