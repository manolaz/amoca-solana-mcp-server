/**
 * Formatting utilities for Solana MCP agent responses
 */

/**
 * Creates a formatted text table from an array of objects
 * @param data Array of objects to display in table
 * @param columns Column configuration with keys and headers
 * @returns Formatted string table
 */
export function formatTable(
  data: Record<string, any>[],
  columns: { key: string; header: string; width?: number }[]
): string {
  if (data.length === 0) return "No data to display";

  // Calculate column widths
  const colWidths = columns.map((col) => {
    const headerWidth = col.header.length;
    const maxDataWidth = Math.max(
      ...data.map((row) => 
        String(row[col.key] || "").length
      )
    );
    return col.width || Math.max(headerWidth, maxDataWidth) + 2;
  });

  // Create header row
  let table = columns
    .map((col, i) => col.header.padEnd(colWidths[i]))
    .join(" | ");
  
  // Add separator
  table += "\n" + columns
    .map((_, i) => "-".repeat(colWidths[i]))
    .join("-+-");

  // Add data rows
  for (const row of data) {
    table += "\n" + columns
      .map((col, i) => {
        const value = row[col.key] === undefined ? "" : String(row[col.key]);
        return value.padEnd(colWidths[i]);
      })
      .join(" | ");
  }

  return table;
}

/**
 * Creates a simple ASCII bar chart
 * @param data Object with labels as keys and values as numbers
 * @param title Chart title
 * @param maxWidth Maximum width of the bars in characters
 * @returns Formatted string chart
 */
export function formatBarChart(
  data: Record<string, number>,
  title: string,
  maxWidth = 40
): string {
  if (Object.keys(data).length === 0) return "No data to display";

  const maxValue = Math.max(...Object.values(data));
  let chart = `${title}\n\n`;

  // Sort entries by value in descending order
  const sortedEntries = Object.entries(data)
    .sort(([, a], [, b]) => b - a);

  // Generate the bars
  for (const [label, value] of sortedEntries) {
    const barLength = Math.max(1, Math.round((value / maxValue) * maxWidth));
    const bar = "█".repeat(barLength);
    chart += `${label.padEnd(15)} | ${bar} ${value}\n`;
  }

  return chart;
}

/**
 * Formats a number as currency
 * @param value Number to format
 * @param currency Currency code
 * @param decimals Number of decimal places
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency = "USD",
  decimals = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Creates an ASCII pie chart representation
 * @param data Object with labels as keys and values as numbers
 * @param title Chart title
 * @returns Formatted string chart
 */
export function formatPieChart(
  data: Record<string, number>,
  title: string
): string {
  if (Object.keys(data).length === 0) return "No data to display";

  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  let chart = `${title}\n\n`;

  // Sort entries by value in descending order
  const sortedEntries = Object.entries(data)
    .sort(([, a], [, b]) => b - a);

  // Calculate percentages and generate visualization
  for (const [label, value] of sortedEntries) {
    const percentage = (value / total) * 100;
    const pieSlice = Math.max(1, Math.round(percentage / 5));
    chart += `${label.padEnd(15)} | ${"●".repeat(pieSlice)} ${percentage.toFixed(1)}%\n`;
  }

  return chart;
}
