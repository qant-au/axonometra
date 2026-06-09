import { describe, expect, it } from 'vitest';
import {
  CURRENT_PLAN_VERSION,
  FloorPlanSerializable,
  safeParsePlan,
  validatePlanShape
} from '../persistence/FloorPlanSerializable';

describe('safeParsePlan', () => {
  it('parses well-formed JSON', () => {
    const out = safeParsePlan('{"a":1}');
    expect(out).toEqual({ a: 1 });
  });

  it('throws on malformed JSON', () => {
    expect(() => safeParsePlan('{ not json')).toThrow();
  });

  it('strips __proto__ keys to prevent prototype pollution', () => {
    const malicious = '{"a":1,"__proto__":{"polluted":true}}';
    const out = safeParsePlan(malicious) as Record<string, unknown>;
    expect(out.a).toBe(1);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strips constructor and prototype keys', () => {
    const out = safeParsePlan(
      '{"a":1,"constructor":{"x":1},"prototype":{"y":1}}'
    ) as Record<string, unknown>;
    expect(out.a).toBe(1);
    // Use hasOwn — every object inherits Object.prototype.constructor.
    expect(Object.hasOwn(out, 'constructor')).toBe(false);
    expect(Object.hasOwn(out, 'prototype')).toBe(false);
  });
});

describe('validatePlanShape', () => {
  it('accepts a well-shaped plan', () => {
    const plan = new FloorPlanSerializable();
    plan.furnitureId = 5;
    plan.wallNodeId = 10;
    expect(validatePlanShape(plan)).toBe(plan);
  });

  it('rejects non-object input', () => {
    expect(validatePlanShape(null)).toBeNull();
    expect(validatePlanShape(42)).toBeNull();
    expect(validatePlanShape('plan')).toBeNull();
    expect(validatePlanShape([])).toBeNull();
  });

  it('rejects when floors is not an array', () => {
    expect(
      validatePlanShape({ floors: 'nope', furnitureId: 0, wallNodeId: 0 })
    ).toBeNull();
  });

  it('rejects when furnitureId or wallNodeId is non-numeric', () => {
    expect(
      validatePlanShape({ floors: [], furnitureId: '0', wallNodeId: 0 })
    ).toBeNull();
    expect(
      validatePlanShape({ floors: [], furnitureId: 0, wallNodeId: null })
    ).toBeNull();
  });
});

describe('FloorPlanSerializable', () => {
  it('defaults version to CURRENT_PLAN_VERSION (1)', () => {
    expect(new FloorPlanSerializable().version).toBe(CURRENT_PLAN_VERSION);
    expect(CURRENT_PLAN_VERSION).toBe(1);
  });

  it('round-trips through safeParsePlan + validatePlanShape', () => {
    const plan = new FloorPlanSerializable();
    plan.furnitureId = 3;
    plan.wallNodeId = 7;
    const text = JSON.stringify(plan);
    const parsed = safeParsePlan(text);
    const validated = validatePlanShape(parsed);
    expect(validated).not.toBeNull();
    expect(validated?.furnitureId).toBe(3);
    expect(validated?.wallNodeId).toBe(7);
    expect(validated?.floors).toEqual([]);
  });
});
