export interface ProductInput {
  name: string;
  description: string;
  contactEmail: string;
  price: number;
}

export type ProductField = keyof ProductInput;
export type ProductValidationErrors = Partial<Record<ProductField, string>>;

export type ProductValidationResult =
  | { success: true; data: ProductInput }
  | {
      success: false;
      errors: ProductValidationErrors;
      values: Record<Exclude<ProductField, "price">, string> & { price: string };
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function validateProductInput(input: Record<string, unknown>): ProductValidationResult {
  const values = {
    name: stringValue(input.name),
    description: stringValue(input.description),
    contactEmail: stringValue(input.contactEmail),
    price: stringValue(input.price),
  };
  const errors: ProductValidationErrors = {};

  if (!values.name) {
    errors.name = "Product name is required.";
  }
  if (!values.description) {
    errors.description = "Description is required.";
  }
  if (!values.contactEmail) {
    errors.contactEmail = "Contact email is required.";
  } else if (!isValidEmail(values.contactEmail)) {
    errors.contactEmail = "Enter a valid email address.";
  }

  const price = Number(values.price);
  if (!values.price) {
    errors.price = "Price is required.";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be greater than 0.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values };
  }

  return {
    success: true,
    data: {
      name: values.name,
      description: values.description,
      contactEmail: values.contactEmail,
      price,
    },
  };
}
