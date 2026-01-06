export const notNull = <T,>(v: T): v is NonNullable<T> => v != null;
