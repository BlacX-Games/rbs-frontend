import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

// Thin on purpose: its job is to prove the jsdom + Testing Library + jest-dom
// wiring works before Phase 1 leans on it for every primitive's keyboard
// contract.
describe('<App />', () => {
  it('renders the console shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operator Console' })).toBeVisible();
  });
});
