import { parse } from 'yaml';

export type RoleOption = string;
export type PersonalityOption = string;

export type ArchetypeId =
  | 'bureaucratic'
  | 'conversational'
  | 'ascetic'
  | 'humility';

export interface ArchetypeDescriptor {
  id: ArchetypeId;
  title: string;
  formula: string;
  inspiration: string;
  examples: string[];
}

export interface WordBanks {
  bureaucraticModifiers: string[];
  bureaucraticNouns: string[];
  bureaucraticConnectors: string[];
  idiomaticPrefixes: string[];
  clauseConcepts: string[];
  standaloneClauses: string[];
  asceticVerbs: string[];
  naturalPhenomena: string[];
  pluralQuantifiers: string[];
  countableMundaneObjects: string[];
  fragmentQuantifiers: string[];
  massMundaneObjects: string[];
}

export interface LexiconData {
  roles: RoleOption[];
  personalities: PersonalityOption[];
  archetypes: ArchetypeDescriptor[];
  wordBanks: WordBanks;
}

function assertStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Invalid lexicon.yaml: "${fieldName}" must be a non-empty array.`);
  }
  return value.map((item, idx) => {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new Error(`Invalid lexicon.yaml: "${fieldName}[${idx}]" must be a non-empty string.`);
    }
    return item;
  });
}

function validateArchetypes(value: unknown): ArchetypeDescriptor[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid lexicon.yaml: "archetypes" must be a non-empty array.');
  }
  const validIds = new Set<ArchetypeId>(['bureaucratic', 'conversational', 'ascetic', 'humility']);
  return value.map((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Invalid lexicon.yaml: "archetypes[${idx}]" must be an object.`);
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !validIds.has(item.id as ArchetypeId)) {
      throw new Error(`Invalid lexicon.yaml: "archetypes[${idx}].id" is unsupported.`);
    }
    return {
      id: item.id as ArchetypeId,
      title: String(item.title ?? ''),
      formula: String(item.formula ?? ''),
      inspiration: String(item.inspiration ?? ''),
      examples: assertStringArray(item.examples, `archetypes[${idx}].examples`),
    };
  });
}

export function parseLexiconYaml(yamlText: string): LexiconData {
  const raw = parse(yamlText) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid lexicon.yaml: root document must be a YAML mapping.');
  }

  const banks = raw.wordBanks as Record<string, unknown> | undefined;
  if (!banks || typeof banks !== 'object') {
    throw new Error('Invalid lexicon.yaml: missing "wordBanks" section.');
  }

  return {
    roles: assertStringArray(raw.roles, 'roles'),
    personalities: assertStringArray(raw.personalities, 'personalities'),
    archetypes: validateArchetypes(raw.archetypes),
    wordBanks: {
      bureaucraticModifiers: assertStringArray(banks.bureaucraticModifiers, 'wordBanks.bureaucraticModifiers'),
      bureaucraticNouns: assertStringArray(banks.bureaucraticNouns, 'wordBanks.bureaucraticNouns'),
      bureaucraticConnectors: assertStringArray(banks.bureaucraticConnectors, 'wordBanks.bureaucraticConnectors'),
      idiomaticPrefixes: assertStringArray(banks.idiomaticPrefixes, 'wordBanks.idiomaticPrefixes'),
      clauseConcepts: assertStringArray(banks.clauseConcepts, 'wordBanks.clauseConcepts'),
      standaloneClauses: assertStringArray(banks.standaloneClauses, 'wordBanks.standaloneClauses'),
      asceticVerbs: assertStringArray(banks.asceticVerbs, 'wordBanks.asceticVerbs'),
      naturalPhenomena: assertStringArray(banks.naturalPhenomena, 'wordBanks.naturalPhenomena'),
      pluralQuantifiers: assertStringArray(banks.pluralQuantifiers, 'wordBanks.pluralQuantifiers'),
      countableMundaneObjects: assertStringArray(banks.countableMundaneObjects, 'wordBanks.countableMundaneObjects'),
      fragmentQuantifiers: assertStringArray(banks.fragmentQuantifiers, 'wordBanks.fragmentQuantifiers'),
      massMundaneObjects: assertStringArray(banks.massMundaneObjects, 'wordBanks.massMundaneObjects'),
    },
  };
}

export async function loadLexicon(url = '/lexicon.yaml'): Promise<LexiconData> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${response.status}).`);
  }
  const yamlText = await response.text();
  return parseLexiconYaml(yamlText);
}
