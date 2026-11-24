import { useMemo, useState, type ChangeEvent } from 'react';
import type { z } from 'zod';

/** Tiny form state: validates the whole object with a zod schema, shows an error once a field is touched. */
export function useZodForm<T extends Record<string, string>>(schema: z.ZodType, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const errors = useMemo(() => {
    const out: Partial<Record<keyof T, string>> = {};
    const r = schema.safeParse(values);
    if (!r.success) {
      for (const issue of r.error.issues) {
        const key = issue.path[0] as keyof T;
        out[key] ??= issue.message;
      }
    }
    return out;
  }, [schema, values]);

  const field = (name: keyof T) => ({
    name: name as string,
    value: values[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    error: touched[name] ? errors[name] : undefined,
  });

  return {
    values,
    field,
    isValid: Object.keys(errors).length === 0,
    touchAll: () => setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])) as never),
  };
}
