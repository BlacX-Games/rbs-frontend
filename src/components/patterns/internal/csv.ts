/**
 * CSV export for DataTable.
 *
 * A `.ts` rather than inline, because the escaping rule below is the entire
 * reason this is not a `join(',')` one-liner and it deserves to be tested on
 * its own.
 */

/**
 * RFC 4180 escaping.
 *
 * A field is quoted whenever it contains a comma, a quote, or a newline, and an
 * embedded quote is doubled. Restaurant names contain commas ("Declan's
 * Smokehouse, Bar & Grill") and review text contains both quotes and newlines,
 * so an unescaped export corrupts the file at the first row that matters.
 *
 * A leading `=`, `+`, `-` or `@` is also prefixed with a tab: spreadsheets
 * interpret those as formulas, which turns operator-authored review text into
 * a CSV-injection vector the moment someone opens the export in Excel.
 */
function escapeField(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `\t${value}` : value;

  return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  // CRLF, which is what RFC 4180 specifies and what Excel expects.
  return [headers, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n');
}

/**
 * Hands the browser a file without a round-trip to the server.
 *
 * A blob URL rather than a data: URI — data URIs are capped at a few megabytes
 * in most browsers, and the plan targets tables of 50,000 rows.
 */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM is what makes Excel read the file as UTF-8 rather than as the
  // local codepage; without it "Crème Brûlée" arrives mojibake. Written as an
  // escape rather than the literal character, which lints as irregular
  // whitespace and is invisible in review either way.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
