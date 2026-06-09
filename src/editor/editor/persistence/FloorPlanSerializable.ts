import { FloorSerializable } from './FloorSerializable';

export const CURRENT_PLAN_VERSION = 1;

export class FloorPlanSerializable {
  public version: number = CURRENT_PLAN_VERSION;
  floors: FloorSerializable[];
  public furnitureId!: number;
  public wallNodeId!: number;

  constructor() {
    this.floors = [];
  }
}

// Reviver dropping prototype-pollution keys at parse time. Returning
// undefined from a JSON.parse reviver removes the key from the result.
function safeJsonReviver(key: string, value: unknown): unknown {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
}

export function safeParsePlan(text: string): unknown {
  return JSON.parse(text, safeJsonReviver);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validatePlanShape(
  value: unknown
): FloorPlanSerializable | null {
  if (!isObject(value)) return null;
  if (!Array.isArray(value.floors)) return null;
  if (typeof value.furnitureId !== 'number') return null;
  if (typeof value.wallNodeId !== 'number') return null;
  return value as unknown as FloorPlanSerializable;
}
