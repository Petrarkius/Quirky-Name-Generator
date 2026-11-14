import {
  ArchetypeId,
  LexiconData,
  PersonalityOption,
  RoleOption,
} from './lexicon';
import { computeRowSeed, mixSeed, SeededPRNG } from './prng';

export type ColumnKey = 'name' | 'role' | 'personality' | 'seed' | 'lore';

export interface ManifestRow {
  index: number;
  seed: number;
  name: string;
  archetype: ArchetypeId;
  role: RoleOption;
  personality: PersonalityOption;
}

export interface GeneratorOptions {
  count: number;
  baseSeed: number;
  activeRoles: readonly RoleOption[];
  activePersonalities: readonly PersonalityOption[];
}

const NAME_SALT = 0x9e3779b9;
const ROLE_SALT = 0x85ebca6b;
const PERSONALITY_SALT = 0xc2b2ae35;

function generateNameFromSeed(
  seed: number,
  lexicon: LexiconData,
  attemptOffset = 0
): { name: string; archetype: ArchetypeId } {
  const rng = new SeededPRNG(mixSeed(seed, NAME_SALT + attemptOffset * 7919));
  const archetypeIndex = rng.nextInt(0, lexicon.archetypes.length - 1);
  const archetype = lexicon.archetypes[archetypeIndex].id;
  const banks = lexicon.wordBanks;

  switch (archetype) {
    case 'bureaucratic': {
      const pattern = rng.nextInt(0, 9);
      if (pattern <= 6) {
        const mod = rng.pick(banks.bureaucraticModifiers);
        const noun = rng.pick(banks.bureaucraticNouns);
        return { name: `${mod} ${noun}`, archetype };
      }
      if (pattern <= 8) {
        const mod = rng.pick(banks.bureaucraticModifiers);
        const noun = rng.pick(banks.bureaucraticNouns);
        const connector = rng.pick(banks.bureaucraticConnectors);
        const secondNoun = rng.pick(banks.bureaucraticNouns);
        if (noun !== secondNoun) {
          return { name: `${mod} ${noun} ${connector} ${secondNoun}`, archetype };
        }
        return { name: `A Question of ${mod} ${noun}`, archetype };
      }
      const noun = rng.pick(banks.bureaucraticNouns);
      const mod = rng.pick(banks.bureaucraticModifiers);
      return { name: `A Question of ${mod} ${noun}`, archetype };
    }

    case 'conversational': {
      const pattern = rng.nextInt(0, 9);
      if (pattern === 9) {
        return { name: rng.pick(banks.standaloneClauses), archetype };
      }
      const prefix = rng.pick(banks.idiomaticPrefixes);
      const concept = rng.pick(banks.clauseConcepts);
      return { name: `${prefix} ${concept}`, archetype };
    }

    case 'ascetic': {
      const verb = rng.pick(banks.asceticVerbs);
      const phenomenon = rng.pick(banks.naturalPhenomena);
      return { name: `${verb} ${phenomenon}`, archetype };
    }

    case 'humility': {
      const usePlural = rng.nextFloat() < 0.45;
      if (usePlural) {
        const quantifier = rng.pick(banks.pluralQuantifiers);
        const obj = rng.pick(banks.countableMundaneObjects);
        return { name: `${quantifier} ${obj}`, archetype };
      }
      const fragment = rng.pick(banks.fragmentQuantifiers);
      const massObj = rng.pick(banks.massMundaneObjects);
      return { name: `${fragment} ${massObj}`, archetype };
    }
  }
}

export function generateManifest(
  options: GeneratorOptions,
  lexicon: LexiconData
): ManifestRow[] {
  const clampedCount = Math.max(1, Math.min(20, Math.trunc(options.count)));
  const rolesPool = options.activeRoles.length > 0 ? options.activeRoles : lexicon.roles;
  const personalitiesPool =
    options.activePersonalities.length > 0 ? options.activePersonalities : lexicon.personalities;

  const seenNames = new Set<string>();
  const rows: ManifestRow[] = [];

  for (let i = 0; i < clampedCount; i++) {
    const rowSeed = computeRowSeed(options.baseSeed, i);

    let attempt = 0;
    let generated = generateNameFromSeed(rowSeed, lexicon, attempt);
    while (seenNames.has(generated.name) && attempt < 12) {
      attempt += 1;
      generated = generateNameFromSeed(rowSeed, lexicon, attempt);
    }
    seenNames.add(generated.name);

    const roleRng = new SeededPRNG(mixSeed(rowSeed, ROLE_SALT));
    const role = roleRng.pick(rolesPool);

    const personalityRng = new SeededPRNG(mixSeed(rowSeed, PERSONALITY_SALT));
    const personality = personalityRng.pick(personalitiesPool);

    rows.push({
      index: i + 1,
      seed: rowSeed,
      name: generated.name,
      archetype: generated.archetype,
      role,
      personality,
    });
  }

  return rows;
}
