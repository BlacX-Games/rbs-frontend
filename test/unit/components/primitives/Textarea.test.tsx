import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from '@/components/primitives/Textarea';
import { renderWithProviders } from '../../../support/render';

/**
 * Textarea shares the Field shell with Input, so the label and error wiring is
 * proven there. What is unique here is §5.6's "no fixed-height text
 * containers" — the clause this element violates most easily.
 */
describe('<Textarea />', () => {
  it('accepts multi-line text under its label', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Textarea label="Review text" />);

    const field = screen.getByRole('textbox', { name: 'Review text' });
    await user.type(field, 'Brisket was dry.{Enter}Service made up for it.');

    expect(field).toHaveValue('Brisket was dry.\nService made up for it.');
  });

  it('grows with its content instead of fixing a height', () => {
    renderWithProviders(<Textarea label="Review text" />);

    const field = screen.getByRole('textbox', { name: 'Review text' });

    // §5.6: layouts must survive +30% text expansion. `field-sizing-content`
    // grows the box in Chromium and `rows` is the floor elsewhere — neither is
    // a fixed height. A `h-*` class here is the regression to catch, and it is
    // invisible until someone localises the console.
    expect(field).toHaveClass('field-sizing-content');
    expect(field.className).not.toMatch(/\bh-\d/);
  });

  it('carries the error semantics through from the shell', () => {
    renderWithProviders(<Textarea error="Redaction cannot be empty." label="Review text" />);

    const field = screen.getByRole('textbox', { name: 'Review text' });

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription('Redaction cannot be empty.');
  });
});
