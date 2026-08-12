import { describe, expect, it } from "vitest";

import { isValidEmail, validateProductInput } from "../src/validation.js";

describe("isValidEmail", () => {
  it("accepts a conventional email address", () => {
    expect(isValidEmail("owner@demo.local")).toBe(true);
  });

  it.each(["missing-at.example", "@demo.local", "user@"])(
    "rejects malformed email %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe("validateProductInput", () => {
  it("normalizes and accepts a valid product", () => {
    const result = validateProductInput({
      name: "  Keyboard  ",
      description: "  Quiet mechanical keyboard  ",
      contactEmail: "  owner@demo.local  ",
      price: "49.95",
    });

    expect(result).toEqual({
      success: true,
      data: {
        name: "Keyboard",
        description: "Quiet mechanical keyboard",
        contactEmail: "owner@demo.local",
        price: 49.95,
      },
    });
  });

  it("accepts a numeric price from a JSON request", () => {
    const result = validateProductInput({
      name: "Keyboard",
      description: "Quiet mechanical keyboard",
      contactEmail: "owner@demo.local",
      price: 49.95,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(49.95);
    }
  });

  it("returns required-field messages for an empty form", () => {
    const result = validateProductInput({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual({
        name: "Product name is required.",
        description: "Description is required.",
        contactEmail: "Contact email is required.",
        price: "Price is required.",
      });
    }
  });

  it.each(["0", "-1", "not-a-number"])("requires a positive price for %s", (price) => {
    const result = validateProductInput({
      name: "Product",
      description: "Description",
      contactEmail: "owner@demo.local",
      price,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.price).toBe("Price must be greater than 0.");
    }
  });

  it("returns an email-format error", () => {
    const result = validateProductInput({
      name: "Product",
      description: "Description",
      contactEmail: "invalid-email",
      price: "1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contactEmail).toBe("Enter a valid email address.");
    }
  });
});
