import { ColumnKey, ManifestRow } from './generator';

export const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'personality', label: 'Personality' },
  { key: 'seed', label: 'Seed' },
  { key: 'lore', label: 'Lore Snippet' },
];

export type LoreMap = Record<number, { status: 'idle' | 'loading' | 'done' | 'error'; text: string; error?: string }>;

function getCellValue(row: ManifestRow, column: ColumnKey, loreMap: LoreMap): string {
  switch (column) {
    case 'name':
      return row.name;
    case 'role':
      return row.role;
    case 'personality':
      return row.personality;
    case 'seed':
      return String(row.seed);
    case 'lore': {
      const entry = loreMap[row.seed];
      if (!entry || entry.status !== 'done') return '';
      return entry.text.replace(/\s+/g, ' ').trim();
    }
  }
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Formats visible rows and columns into Markdown.
 * - Mode B (Exactly 1 column checked): Flat Markdown bullet list (`- Value`).
 * - Mode A (2 or more columns checked): GitHub-flavored Markdown table.
 */
export function formatMarkdownExport(
  rows: ManifestRow[],
  activeColumns: ColumnKey[],
  loreMap: LoreMap
): string {
  if (activeColumns.length === 0 || rows.length === 0) {
    return '';
  }

  // Mode B: Single-Column Output
  if (activeColumns.length === 1) {
    const col = activeColumns[0];
    return rows
      .map((row) => {
        const val = getCellValue(row, col, loreMap);
        return `- ${val || '—'}`;
      })
      .join('\n');
  }

  // Mode A: Multi-Column Output
  const labels = activeColumns.map(
    (key) => COLUMN_DEFINITIONS.find((def) => def.key === key)?.label ?? key
  );

  const headerLine = `| ${labels.join(' | ')} |`;
  const separatorLine = `| ${activeColumns.map(() => ':---').join(' | ')} |`;
  const bodyLines = rows.map((row) => {
    const cells = activeColumns.map((col) => escapeMarkdownCell(getCellValue(row, col, loreMap)));
    return `| ${cells.join(' | ')} |`;
  });

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}
