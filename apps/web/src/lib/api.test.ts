import { describe, expect, it } from "vitest";

import { ApiError, unwrapList, unwrapObject } from "./api";

describe("API response helpers", () => {
  it("unwraps list and pagination response shapes", () => {
    expect(unwrapList<{ id: string }>([{ id: "one" }])).toEqual([{ id: "one" }]);
    expect(unwrapList<{ id: string }>({ items: [{ id: "two" }], total: 1 })).toEqual([
      { id: "two" },
    ]);
  });

  it("unwraps data envelopes without modifying direct objects", () => {
    expect(unwrapObject<{ id: string }>({ data: { id: "wrapped" } })).toEqual({
      id: "wrapped",
    });
    expect(unwrapObject<{ id: string }>({ id: "direct" })).toEqual({ id: "direct" });
  });

  it("retains HTTP status on API errors", () => {
    const error = new ApiError("Unauthorized", 401);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(401);
  });
});
