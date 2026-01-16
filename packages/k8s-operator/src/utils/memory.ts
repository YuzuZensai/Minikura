/**
 * Memory utility functions for Kubernetes resources
 */

/**
 * Calculate memory for Java (lower than what's requested to account for JVM overhead)
 * @param memoryString Memory string in format like "512M" or "1G"
 * @param factor Multiplicative factor to apply (e.g., 0.8 for 80%)
 * @returns Calculated memory string in same format
 */
export function calculateJavaMemory(memoryString: string, factor: number): string {
  const match = memoryString.match(/^(\d+)([MG])$/i);
  if (!match) return "512M"; // Default if format is not recognized

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  const calculatedValue = Math.round(value * factor);
  return `${calculatedValue}${unit.toUpperCase()}`;
}

/**
 * Convert memory string to Kubernetes format (e.g., "1G" -> "1Gi")
 * @param memoryString Memory string in format like "512M" or "1G"
 * @returns Memory string in Kubernetes format
 */
export function convertToK8sFormat(memoryString: string): string {
  const match = memoryString.match(/^(\d+)([MG])$/i);
  if (!match) return "1Gi"; // Default if format is not recognized

  const [, valueStr, unit] = match;

  if (unit.toUpperCase() === "G") {
    return `${valueStr}Gi`;
  } else {
    return `${valueStr}Mi`;
  }
}
