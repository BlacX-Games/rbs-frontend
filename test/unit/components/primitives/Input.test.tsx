import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/primitives/Input';
import { renderWithProviders } from '../../../support/render';

/**
 * The Field shell's contract, exercised through Input.
 *
 * Textarea, NumberInput, and Select wear the same shell, so the label
 * association, description wiring, and error semantics are proven once here
 * rather than four times over.
 */
describe('<Input />', () => {
  it('associates its label so clicking the text focuses the field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Input label="Restaurant name" />);

    await user.click(screen.getByText('Restaurant name'));

    // A real <label for>, not aria-label. In a dense form the click target is
    // half the point, and aria-label gives none of it.
    expect(screen.getByRole('textbox', { name: 'Restaurant name' })).toHaveFocus();
  });

  it('keeps a hidden label in the accessibility tree', () => {
    renderWithProviders(<Input label="Search sessions" labelHidden />);

    // sr-only, not display:none. A filter bar with no visible labels still has
    // to announce which field is which.
    expect(screen.getByRole('textbox', { name: 'Search sessions' })).toBeVisible();
  });

  it('describes the field with its description', () => {
    renderWithProviders(
      <Input description="Shown to players on the restaurant card." label="Restaurant name" />,
    );

    expect(screen.getByRole('textbox', { name: 'Restaurant name' })).toHaveAccessibleDescription(
      'Shown to players on the restaurant card.',
    );
  });

  it('marks itself invalid and describes why', () => {
    renderWithProviders(<Input error="Name is already taken." label="Restaurant name" />);

    const field = screen.getByRole('textbox', { name: 'Restaurant name' });

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription('Name is already taken.');
  });

  it('reads the description before the error', () => {
    renderWithProviders(
      <Input
        description="Shown to players."
        error="Name is already taken."
        label="Restaurant name"
      />,
    );

    // Instruction then correction. The reverse order tells an operator what is
    // wrong before telling them what the field is for.
    expect(screen.getByRole('textbox', { name: 'Restaurant name' })).toHaveAccessibleDescription(
      'Shown to players. Name is already taken.',
    );
  });

  it('stays silent about validity when there is no error', () => {
    renderWithProviders(<Input label="Restaurant name" />);

    // aria-invalid="false" is valid but noisy, and it would render on every
    // healthy field in the console.
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('gives each instance its own ids', () => {
    renderWithProviders(
      <>
        <Input description="First." label="Concept" />
        <Input description="Second." label="Cuisine" />
      </>,
    );

    // Duplicate ids are an axe violation and, worse, silently point both labels
    // at the same field. useId is what prevents it in the gallery, where every
    // primitive appears several times.
    expect(screen.getByRole('textbox', { name: 'Concept' })).toHaveAccessibleDescription('First.');
    expect(screen.getByRole('textbox', { name: 'Cuisine' })).toHaveAccessibleDescription('Second.');
  });
});
