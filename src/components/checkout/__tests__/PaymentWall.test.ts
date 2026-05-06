/**
 * @file src/components/checkout/__tests__/PaymentWall.test.ts
 * PaymentWall 纯逻辑单元测试 / Unit tests for PaymentWall pure logic
 */
import { describe, it, expect } from "vitest";
import { resolveInitialMethod, canSwitchMethod, resolveLayout } from "../PaymentWall";

describe("resolveInitialMethod", () => {
  it("返回第一个 enabled 方式的 id / returns id of the first enabled method", () => {
    const methods = [
      { id: "card", enabled: false },
      { id: "paypal", enabled: true },
      { id: "alipay", enabled: true },
    ];
    expect(resolveInitialMethod(methods)).toBe("paypal");
  });

  it("全部 disabled 时返回 null / returns null when all methods are disabled", () => {
    const methods = [{ id: "card", enabled: false }];
    expect(resolveInitialMethod(methods)).toBeNull();
  });
});

describe("canSwitchMethod", () => {
  it("当前方式 ready 时可以切换 / can switch when current method is ready", () => {
    expect(canSwitchMethod({ isCurrentReady: true, targetId: "card", activeId: "paypal" })).toBe(true);
  });

  it("当前方式 loading 时不可以切换 / cannot switch when current method is loading", () => {
    expect(canSwitchMethod({ isCurrentReady: false, targetId: "card", activeId: "paypal" })).toBe(false);
  });

  it("点击当前已激活的方式不受 ready 限制 / clicking active method is always allowed", () => {
    expect(canSwitchMethod({ isCurrentReady: false, targetId: "paypal", activeId: "paypal" })).toBe(true);
  });
});

describe("resolveLayout", () => {
  it("宽度 >= 阈值时使用 tabs / uses tabs when width >= threshold", () => {
    expect(resolveLayout(300)).toBe("tabs");
    expect(resolveLayout(400)).toBe("tabs");
    expect(resolveLayout(301)).toBe("tabs");
  });

  it("宽度 < 阈值时使用 radio / uses radio when width < threshold", () => {
    expect(resolveLayout(299)).toBe("radio");
    expect(resolveLayout(200)).toBe("radio");
    expect(resolveLayout(0)).toBe("radio");
  });

  it("恰好等于阈值时使用 tabs / uses tabs at exactly the threshold", () => {
    expect(resolveLayout(300)).toBe("tabs");
  });
});
