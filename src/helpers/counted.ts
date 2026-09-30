/** "1 wall", "3 walls"; `plural` for an irregular one. */
export function counted(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** What the plan views say they show: "4 walls and 1 piece of furniture". */
export function wallsAndFurniture(walls: number, furniture: number) {
  return `${counted(walls, 'wall')} and ${counted(
    furniture,
    'piece of furniture',
    'pieces of furniture'
  )}`;
}
