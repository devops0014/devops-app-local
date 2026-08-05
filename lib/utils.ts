export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function difficultyTone(difficulty: string) {
  if (difficulty === "Easy") return "green" as const;
  if (difficulty === "Medium") return "amber" as const;
  return "rose" as const;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
