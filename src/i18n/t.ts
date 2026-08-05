import { en, type Messages } from '@/i18n/en';

/**
 * `t()` — the only way a user-visible string reaches the DOM.
 *
 * The whole point of this module is that **the key and its parameters are
 * checked by the compiler**. `t('pagination.range', { from, to })` is a build
 * error because that message also carries `{total}`, and `t('paginaton.range')`
 * is a build error because the key is misspelt. Both are mistakes that a
 * string-keyed catalogue normally surfaces as a literal `{total}` or an empty
 * span in production.
 *
 * ── Where it is called ──────────────────────────────────────────────────────
 * At the composition site — a route, a feature component — never inside a
 * primitive. Every primitive already takes its labels as required props, and
 * `contract.test.tsx` fails the build if one renders text the caller did not
 * supply. Calling `t()` inside a primitive would move a translation decision
 * into the design system, where a caller cannot override it.
 *
 * ── Not a hook ──────────────────────────────────────────────────────────────
 * With one locale there is nothing to subscribe to, and a hook would force
 * every helper that builds a label — a column definition, a `stepLabel`
 * callback — to become one too. A second locale adds a `useT()` beside this
 * that closes over the active locale; the call sites do not change shape.
 */

export type MessageKey = keyof Messages;

/**
 * Pulls `{name}` placeholders out of a literal message type.
 *
 * Recursive on the tail, so a message with three placeholders yields all three
 * as a union. A message with none yields `never`, which is what makes the
 * parameter argument disappear entirely below.
 */
type ParamNames<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | ParamNames<Rest>
  : never;

type ParamsOf<K extends MessageKey> = ParamNames<Messages[K]>;

/** The values a given message needs. Numbers are allowed and stringified. */
export type MessageValues<K extends MessageKey> = Readonly<Record<ParamsOf<K>, string | number>>;

/**
 * `[ParamsOf<K>] extends [never]` — wrapped in a tuple deliberately.
 *
 * A bare `ParamsOf<K> extends never` distributes over the union and collapses
 * to `never` for *every* message, making the values argument optional
 * everywhere and defeating the check. The tuple stops distribution, so the
 * argument is required exactly when the message has placeholders.
 */
type Args<K extends MessageKey> = [ParamsOf<K>] extends [never] ? [] : [values: MessageValues<K>];

/**
 * Keys whose message carries no placeholders.
 *
 * The type a caller needs when it builds a key at RUNTIME — `api/errors.ts`
 * turns a backend `error.code` into `error.${code}` — because such a caller has
 * no values to pass and no way to know statically whether the key it landed on
 * wanted some. Narrowing to this makes "resolved dynamically" and "takes
 * parameters" mutually exclusive by construction, rather than a rule someone
 * has to remember when adding a message.
 */
export type StaticMessageKey = {
  [K in MessageKey]: [ParamsOf<K>] extends [never] ? K : never;
}[MessageKey];

const PLACEHOLDER = /\{(\w+)\}/g;

export function t<K extends MessageKey>(key: K, ...args: Args<K>): string {
  const message: string = en[key];
  const values = args[0] as Record<string, string | number> | undefined;

  if (values === undefined) return message;

  return message.replace(PLACEHOLDER, (_match, name: string) => {
    const value = values[name];

    // Unreachable through the public type, and reachable through an `as` cast
    // or a hand-built values object. Throwing beats rendering a literal
    // "{seconds}" to an operator, which is the failure this module exists to
    // make impossible — and it surfaces at the call site, in a test, rather
    // than in a screenshot three weeks later.
    if (value === undefined) {
      throw new Error(`Message "${key}" needs a value for "{${name}}".`);
    }

    return String(value);
  });
}

/** Every key in the catalogue. For the completeness test, and nothing else. */
export const MESSAGE_KEYS = Object.keys(en) as readonly MessageKey[];
