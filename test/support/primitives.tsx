import { Check } from 'lucide-react';
import type { ReactElement } from 'react';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Checkbox } from '@/components/primitives/Checkbox';
import { IconButton } from '@/components/primitives/IconButton';
import { Input } from '@/components/primitives/Input';
import { NumberInput } from '@/components/primitives/NumberInput';
import { Progress } from '@/components/primitives/Progress';
import { Radio, RadioGroup } from '@/components/primitives/Radio';
import { Select } from '@/components/primitives/Select';
import { Slider } from '@/components/primitives/Slider';
import { Switch } from '@/components/primitives/Switch';
import { Tag } from '@/components/primitives/Tag';
import { Textarea } from '@/components/primitives/Textarea';

/**
 * Every primitive that reaches the accessibility tree, in one table.
 *
 * The alternative — repeating the same five cross-cutting assertions in
 * seventeen files — guarantees that one copy eventually drifts and nobody
 * notices which.
 *
 * IMPORTANT: every `render` is an INLINE ARROW inside the object literal, and
 * must stay that way. `react-refresh/only-export-components` skips `*.test.tsx`
 * but NOT this file, and a `.tsx` that exports data while declaring a top-level
 * component fails with `localComponents`. Lifting one of these into a named
 * `function Sample()` is the obvious tidy-up and it breaks the build.
 *
 * Skeleton and Separator are absent on purpose: both are `aria-hidden` or
 * `role="none"` by design, so there is no name to assert. They are covered in
 * `display.test.tsx`.
 */

/** Deliberately unlike any real copy, so a hard-coded string cannot hide in it. */
export const SENTINEL = 'Zqx Label';

/** Second and third strings for primitives that require more than one. */
export const EXTRA = {
  placeholder: 'Zqx Placeholder',
  increment: 'Zqx Increment',
  decrement: 'Zqx Decrement',
  remove: 'Zqx Remove',
  busy: 'Zqx Busy',
} as const;

export interface PrimitiveCase {
  readonly name: string;
  /** The ARIA role the primitive should resolve under. */
  readonly role: string;
  /** Every user-visible string handed in, so leftovers can be detected. */
  readonly supplied: readonly string[];
  readonly render: () => ReactElement;
  /** Whether Tab should land on the primitive or on something inside it. */
  readonly focusable: boolean;
}

export const PRIMITIVE_CASES: readonly PrimitiveCase[] = [
  {
    name: 'Button',
    role: 'button',
    supplied: [SENTINEL],
    render: () => <Button className="probe">{SENTINEL}</Button>,
    focusable: true,
  },
  {
    name: 'IconButton',
    role: 'button',
    supplied: [SENTINEL],
    render: () => <IconButton className="probe" icon={<Check />} label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'Input',
    role: 'textbox',
    supplied: [SENTINEL],
    render: () => <Input className="probe" label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'Textarea',
    role: 'textbox',
    supplied: [SENTINEL],
    render: () => <Textarea className="probe" label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'NumberInput',
    role: 'spinbutton',
    supplied: [SENTINEL, EXTRA.increment, EXTRA.decrement],
    render: () => (
      <NumberInput
        className="probe"
        decrementLabel={EXTRA.decrement}
        defaultValue={0}
        incrementLabel={EXTRA.increment}
        label={SENTINEL}
      />
    ),
    focusable: true,
  },
  {
    name: 'Select',
    role: 'combobox',
    supplied: [SENTINEL, EXTRA.placeholder],
    render: () => (
      <Select className="probe" items={[]} label={SENTINEL} placeholder={EXTRA.placeholder} />
    ),
    focusable: true,
  },
  {
    name: 'Checkbox',
    role: 'checkbox',
    supplied: [SENTINEL],
    render: () => <Checkbox className="probe" label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'Radio',
    role: 'radio',
    supplied: [SENTINEL, 'Zqx Group'],
    render: () => (
      <RadioGroup className="probe" label="Zqx Group">
        <Radio label={SENTINEL} value="only" />
      </RadioGroup>
    ),
    focusable: true,
  },
  {
    name: 'Switch',
    role: 'switch',
    supplied: [SENTINEL],
    render: () => <Switch className="probe" label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'Slider',
    role: 'slider',
    supplied: [SENTINEL],
    render: () => <Slider className="probe" defaultValue={[0]} label={SENTINEL} />,
    focusable: true,
  },
  {
    name: 'Avatar',
    role: 'img',
    // The initials ARE derived from the name, so they are not leftover text.
    supplied: [SENTINEL, 'ZL'],
    render: () => <Avatar className="probe" name={SENTINEL} />,
    focusable: false,
  },
  {
    name: 'Progress',
    role: 'progressbar',
    supplied: [SENTINEL],
    render: () => <Progress className="probe" label={SENTINEL} value={40} />,
    focusable: false,
  },
  {
    name: 'Badge',
    role: 'generic',
    supplied: [SENTINEL],
    render: () => <Badge className="probe">{SENTINEL}</Badge>,
    focusable: false,
  },
  {
    name: 'Tag',
    role: 'generic',
    supplied: [SENTINEL, EXTRA.remove],
    render: () => (
      <Tag className="probe" onRemove={() => undefined} removeLabel={EXTRA.remove}>
        {SENTINEL}
      </Tag>
    ),
    // The tag itself is not a tab stop, but its remove button is — which is the
    // point of Tag taking the control height when it becomes removable.
    focusable: true,
  },
];
