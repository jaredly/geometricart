export const filterNull = <T,>(t: T): t is NonNullable<T> => t != null;
