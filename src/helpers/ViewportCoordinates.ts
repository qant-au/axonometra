// Rounds a plan coordinate to the 10 cm grid. Screen-to-plan conversion is
// per editor: EditorInstance.viewportX / viewportY.
export function snap(val: number) {
  const rest = val % 10;
  const cat = val - rest;
  if (rest < 5) {
    return cat;
  }
  return cat + 10;
}
