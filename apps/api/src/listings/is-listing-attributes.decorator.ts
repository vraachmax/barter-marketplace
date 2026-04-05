import { registerDecorator, ValidationOptions } from 'class-validator';

const MAX_KEYS = 48;
const MAX_KEY_LEN = 64;
const MAX_STRING = 500;

function isListingAttributesValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value) || value === null) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length > MAX_KEYS) return false;
  for (const k of keys) {
    if (k.length > MAX_KEY_LEN || k.trim() !== k) return false;
    const v = (value as Record<string, unknown>)[k];
    if (v === null || v === undefined) continue;
    const t = typeof v;
    if (t === 'string') {
      if ((v as string).length > MAX_STRING) return false;
    } else if (t === 'number') {
      if (!Number.isFinite(v)) return false;
    } else if (t === 'boolean') {
      continue;
    } else {
      return false;
    }
  }
  return true;
}

/** Плоский JSON-объект: только string | number | boolean | null, без вложенности. */
export function IsListingAttributes(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isListingAttributes',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isListingAttributesValue(value),
        defaultMessage: () =>
          'attributes must be a flat object with at most 48 string/boolean/number (or null) fields',
      },
    });
  };
}
