export function checkRepeatedLines(text: string) {
  // Split the text by new lines into an array of lines
  const lines = text.split("\n");
  const seenLines = new Set<string>();

  // Loop through each line
  for (const line of lines) {
    // Trim any extra spaces for a cleaner comparison
    const trimmedLine = line.trim();
    // Check if the line has been seen before
    if (seenLines.has(trimmedLine)) {
      console.log(`Repeated line found: "${trimmedLine}"`);
    }
    seenLines.add(trimmedLine);
  }

  const output: string[] = Array.from(seenLines);
  console.log(output);
  return output;
}
