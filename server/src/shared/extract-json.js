/**
 * Strip markdown fences and surrounding text from an AI response
 * to extract a clean JSON string.
 */
export function extractJson(raw) {
  // Try to find a JSON code fence first
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }

  // Try to find the first { ... } block
  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1) {
    return JSON.parse(raw.slice(braceStart, braceEnd + 1));
  }

  throw new Error('Kunne ikke trekke ut JSON fra AI-respons');
}
