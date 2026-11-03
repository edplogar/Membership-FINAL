/**
 * Service to export datasets to CSV files with proper headers and UTF-8 encoding
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const processCell = (cell: string | number | boolean) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM
    [
      headers.map(processCell).join(','),
      ...rows.map((row) => row.map(processCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
