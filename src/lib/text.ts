export function richify(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-signal-ink font-medium hover:underline">$1</a>'
    );
}

export function splitEmoji(s: string): { icon: string; rest: string } {
  const trimmed = s.trimStart();
  const chars = Array.from(trimmed);
  if (chars.length === 0) return { icon: "", rest: "" };
  const first = chars[0];
  const cp = first.codePointAt(0) ?? 0;
  if (cp > 127) {
    return { icon: first, rest: chars.slice(1).join("").trimStart() };
  }
  return { icon: "", rest: trimmed };
}
