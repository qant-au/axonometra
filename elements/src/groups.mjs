// Groups shared by every consumer. Order is display order. Ids are stable:
// consumers store them, so never rename one.
export const GROUPS = [
  { id: 'living', name: 'Living' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'dining', name: 'Dining' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bathroom', name: 'Bathroom and laundry' },
  { id: 'office', name: 'Office' },
  { id: 'comms', name: 'Comms and server room' },
  { id: 'network', name: 'Networking and AV' },
  { id: 'security', name: 'Security' },
  { id: 'safety', name: 'Fire and safety' },
  { id: 'outdoor', name: 'Outdoor and small buildings' },
  { id: 'vehicles', name: 'Vehicles and EV charging' },
  { id: 'structure', name: 'Structure' }
];
