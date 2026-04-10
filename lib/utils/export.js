import { Parser as Json2CsvParser } from 'json2csv';

/**
 * Convert data array to JSON string
 */
export function toJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Convert data array to CSV string
 */
export function toCsv(data) {
  if (!data || !data.length) return '';
  try {
    const fields = Object.keys(data[0]);
    const parser = new Json2CsvParser({ fields });
    return parser.parse(data);
  } catch (err) {
    // Fallback: manual CSV
    const keys = Object.keys(data[0]);
    const header = keys.join(',');
    const rows = data.map(row =>
      keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [header, ...rows].join('\n');
  }
}
