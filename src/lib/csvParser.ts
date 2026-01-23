// Simple CSV parser utility

export interface ParsedCSV<T = Record<string, string>> {
  headers: string[];
  rows: T[];
  errors: string[];
}

export function parseCSV<T = Record<string, string>>(
  csvText: string,
  requiredHeaders: string[] = []
): ParsedCSV<T> {
  const errors: string[] = [];
  const lines = csvText.trim().split(/\r?\n/);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ['Empty CSV file'] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  // Validate required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required.toLowerCase())) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { headers, rows: [], errors };
  }

  // Parse rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || '';
    }
    
    rows.push(row as T);
  }

  return { headers, rows, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
}

export function generateCSVTemplate(headers: string[], sampleData?: Record<string, string>[]): string {
  const lines = [headers.join(',')];
  
  if (sampleData) {
    for (const row of sampleData) {
      const values = headers.map(h => {
        const value = row[h] || '';
        // Escape values with commas or quotes
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      lines.push(values.join(','));
    }
  }
  
  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
