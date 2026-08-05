import type { Archetype, PriceBracket } from '@/domain/enums';

/**
 * The 10-concept catalogue, transcribed verbatim from
 * `rbs-backend/prisma/seed.ts`.
 *
 * §7.3: fixtures are derived from the real seed, not invented — so the demo
 * shows the concepts the game actually grades against, and someone comparing
 * the console to a seeded database sees the same ten names in the same order.
 * `08_Content_Data.md` §8.1 is the source both files copy from.
 *
 * Kept in its own module because it is DATA, not generated: nothing here comes
 * out of the seeded RNG, and mixing the two in one file invites someone to
 * "improve" a canonical tag list with a random one.
 */
export interface ConceptSeed {
  readonly name: string;
  readonly cuisineTags: readonly string[];
  readonly vibeTags: readonly string[];
  readonly priceBracket: PriceBracket;
  readonly targetArchetypes: readonly Archetype[];
}

export const CONCEPT_SEEDS: readonly ConceptSeed[] = [
  {
    name: 'Neighborhood Pub / Tavern',
    cuisineTags: ['comfort', 'hearty', 'fried', 'beer-friendly'],
    vibeTags: ['warm', 'rustic', 'casual', 'lively'],
    priceBracket: 'budget_mid',
    targetArchetypes: ['Regular', 'BudgetGuest', 'SportsFan', 'FamilyDiner'],
  },
  {
    name: 'Southern BBQ',
    cuisineTags: ['smoky', 'rich', 'bold', 'hearty'],
    vibeTags: ['warm', 'rustic', 'casual'],
    priceBracket: 'mid',
    targetArchetypes: ['Foodie', 'Regular', 'BudgetGuest', 'FamilyDiner'],
  },
  {
    name: 'Fine Dining',
    cuisineTags: ['refined', 'seasonal', 'delicate', 'plated'],
    vibeTags: ['formal', 'quiet', 'elegant'],
    priceBracket: 'fine',
    targetArchetypes: ['Foodie', 'Critic', 'Influencer'],
  },
  {
    name: 'Rooftop Cocktail Lounge',
    cuisineTags: ['small plates', 'fresh', 'bar-forward'],
    vibeTags: ['lively', 'stylish', 'dim'],
    priceBracket: 'upscale',
    targetArchetypes: ['CocktailEnthusiast', 'Influencer', 'Foodie'],
  },
  {
    name: 'Sports Bar',
    cuisineTags: ['comfort', 'fried', 'shareable', 'beer-friendly'],
    vibeTags: ['loud', 'lively', 'casual', 'TVs'],
    priceBracket: 'budget_mid',
    targetArchetypes: ['SportsFan', 'BudgetGuest', 'FamilyDiner'],
  },
  {
    name: 'Coastal Seafood',
    cuisineTags: ['fresh', 'acidic', 'herbal', 'light'],
    vibeTags: ['breezy', 'casual', 'warm'],
    priceBracket: 'mid_upscale',
    targetArchetypes: ['Foodie', 'Tourist', 'FamilyDiner'],
  },
  {
    name: 'Retro Diner',
    cuisineTags: ['comfort', 'sweet', 'familiar'],
    vibeTags: ['warm', 'nostalgic', 'casual'],
    priceBracket: 'budget',
    targetArchetypes: ['Tourist', 'FamilyDiner', 'BudgetGuest', 'PickyEater'],
  },
  {
    name: 'German Beer Hall',
    cuisineTags: ['hearty', 'salty', 'rich', 'beer-friendly'],
    vibeTags: ['loud', 'communal', 'lively'],
    priceBracket: 'mid',
    targetArchetypes: ['SportsFan', 'Regular', 'FamilyDiner'],
  },
  {
    name: 'Underground Jazz Club',
    cuisineTags: ['small plates', 'refined', 'bar-forward'],
    vibeTags: ['dim', 'intimate', 'quiet'],
    priceBracket: 'upscale',
    targetArchetypes: ['CocktailEnthusiast', 'Foodie', 'Critic'],
  },
  {
    name: 'Fantasy Tavern',
    cuisineTags: ['hearty', 'rustic', 'themed'],
    vibeTags: ['themed', 'warm', 'lively'],
    priceBracket: 'mid',
    targetArchetypes: ['Regular', 'Foodie', 'FamilyDiner'],
  },
];
