import { describe, expect, it } from "vitest";
import { resolveShippingCost, roundMoney } from "./shipping";

describe("resolveShippingCost", () => {
  it("charges the governorate rate when no threshold is configured", () => {
    expect(
      resolveShippingCost({
        rate: 60,
        subtotal: 5000,
        freeShippingThreshold: null,
      }),
    ).toEqual({ cost: 60, isFree: false });
  });

  it("charges the rate below the threshold", () => {
    expect(
      resolveShippingCost({
        rate: 60,
        subtotal: 4999,
        freeShippingThreshold: 5000,
      }),
    ).toEqual({ cost: 60, isFree: false });
  });

  it("is free exactly at the threshold, not just above it", () => {
    expect(
      resolveShippingCost({
        rate: 60,
        subtotal: 5000,
        freeShippingThreshold: 5000,
      }),
    ).toEqual({ cost: 0, isFree: true });
  });

  it("is free above the threshold", () => {
    expect(
      resolveShippingCost({
        rate: 130,
        subtotal: 9000,
        freeShippingThreshold: 5000,
      }),
    ).toEqual({ cost: 0, isFree: true });
  });

  it("treats a zero rate as free shipping for that governorate", () => {
    expect(
      resolveShippingCost({
        rate: 0,
        subtotal: 100,
        freeShippingThreshold: null,
      }),
    ).toEqual({ cost: 0, isFree: true });
  });

  /*
   * A threshold of 0 would otherwise make every order qualify, silently
   * disabling paid shipping site-wide. Only a positive threshold is a
   * promotion; 0 and null both mean "off".
   */
  it("ignores a zero or negative threshold", () => {
    for (const freeShippingThreshold of [0, -1]) {
      expect(
        resolveShippingCost({
          rate: 60,
          subtotal: 5000,
          freeShippingThreshold,
        }),
      ).toEqual({ cost: 60, isFree: false });
    }
  });

  it("never returns a negative cost, whatever the stored rate", () => {
    const { cost } = resolveShippingCost({
      rate: -50,
      subtotal: 100,
      freeShippingThreshold: null,
    });
    expect(cost).toBe(0);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });

  it("collapses float drift from repeated addition", () => {
    // 0.1 + 0.2 === 0.30000000000000004, which must not reach a numeric column.
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("leaves whole numbers alone", () => {
    expect(roundMoney(3500)).toBe(3500);
  });
});
