export function calculateJavaMemory(memory: number | string, factor: number): string {
  if (typeof memory === "number") {
    const calculatedValue = Math.round(memory * factor);
    return `${calculatedValue}M`;
  }

  const match = memory.match(/^(\d+)([MG])$/i);
  if (!match) return "512M";

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  const calculatedValue = Math.round(value * factor);
  return `${calculatedValue}${unit.toUpperCase()}`;
}

export function convertToK8sFormat(memory: number | string): string {
  if (typeof memory === "number") {
    return `${memory}Mi`;
  }

  const match = memory.match(/^(\d+)([MG])$/i);
  if (!match) return "1Gi";

  const [, valueStr, unit] = match;

  if (unit.toUpperCase() === "G") {
    return `${valueStr}Gi`;
  } else {
    return `${valueStr}Mi`;
  }
}
