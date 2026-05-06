/**
 * @file src/config/__tests__/payment-wall.test.ts
 * PaymentWall 配置结构单元测试 / Unit tests for PaymentWall config structure
 * TDD RED phase
 */
import { describe, it, expect } from "vitest";
import { PAYMENT_WALL_CONFIG, getEnabledMethods } from "../payment-wall";

describe("PAYMENT_WALL_CONFIG", () => {
  it("应包含至少一个支付方式 / should contain at least one payment method", () => {
    expect(PAYMENT_WALL_CONFIG.methods.length).toBeGreaterThan(0);
  });

  it("每个方式都需要 id、label、enabled 字段 / every method must have id, label, enabled fields", () => {
    for (const m of PAYMENT_WALL_CONFIG.methods) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("label");
      expect(m.label).toHaveProperty("zh");
      expect(m.label).toHaveProperty("en");
      expect(m).toHaveProperty("enabled");
    }
  });

  it("id 必须唯一 / ids must be unique", () => {
    const ids = PAYMENT_WALL_CONFIG.methods.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getEnabledMethods", () => {
  it("只返回 enabled=true 的方式 / returns only enabled methods", () => {
    const enabled = getEnabledMethods();
    expect(enabled.every((m) => m.enabled)).toBe(true);
  });

  it("返回的数量 <= 全部方式总数 / count <= total methods", () => {
    expect(getEnabledMethods().length).toBeLessThanOrEqual(
      PAYMENT_WALL_CONFIG.methods.length
    );
  });
});
