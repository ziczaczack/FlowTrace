// Minimal CSV parser (RFC 4180-ish). Handles quoted fields, embedded
// commas/newlines, escaped double-quotes (""), BOM stripping, both LF and
// CRLF line endings. No external dependencies.

export type CsvRow = string[];

export function parseCsv(text: string): CsvRow[] {
  // Strip UTF-8 BOM that Excel/Maybank exports tend to include.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: CsvRow[] = [];
  let row: CsvRow = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote inside a quoted field
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (ch === "\r") {
      // Skip — \n handler below will close the row
      i += 1;
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  // Trailing field / row (file may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty trailing rows that often appear at the end of an
  // exported file.
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0].trim() === "") rows.pop();
    else break;
  }

  return rows;
}

// Heuristic: treat row 0 as a header if it contains no all-numeric cells
// (real bank rows always have a number column).
export function looksLikeHeader(row: CsvRow | undefined): boolean {
  if (!row || row.length === 0) return false;
  const numeric = row.filter((c) => /^[+\-]?\d[\d,.\s]*$/.test(c.trim()));
  return numeric.length === 0;
}
