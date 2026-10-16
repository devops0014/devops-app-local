/**
 * How big and bright the dashboard streak flame is. It grows with the streak
 * so keeping it alive feels like something.
 */
export type FlameLevel = {
  level: 0 | 1 | 2 | 3 | 4;
  /** Icon size in px. */
  size: number;
  /** Max glow radius in px for the pulse. */
  glow: number;
  label: string;
};

export function flameLevel(streak: number): FlameLevel {
  const days = Math.max(0, Math.floor(streak || 0));
  if (days === 0) return { level: 0, size: 17, glow: 0, label: "Practise today to light it" };
  if (days < 3) return { level: 1, size: 18, glow: 6, label: "Lit. Come back tomorrow" };
  if (days < 7) return { level: 2, size: 21, glow: 10, label: "Warming up" };
  if (days < 14) return { level: 3, size: 24, glow: 14, label: "On fire" };
  return { level: 4, size: 27, glow: 20, label: "Unstoppable" };
}
