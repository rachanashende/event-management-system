// Lightweight client-side CSV export — no extra dependencies needed.

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote the field if it contains a comma, quote, or newline; escape inner quotes.
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * @param {{ key: string, label: string }[]} columns
 * @param {object[]} rows
 * @returns {string} CSV content
 */
export function toCSV(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadCSV(filename, csvContent) {
  // Prefix with a UTF-8 BOM so Excel opens special characters (₹, é, etc.) correctly.
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
