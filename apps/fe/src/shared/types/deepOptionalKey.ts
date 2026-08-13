export type DeepOptionalKey<T, K> = T extends object
  ? K extends keyof T
    ? Omit<
        {
          [P in keyof T]: DeepOptionalKey<T[P], K>;
        },
        K
      > &
        Partial<Record<K, T[K]>>
    : {
        [P in keyof T]: DeepOptionalKey<T[P], K>;
      }
  : T;
