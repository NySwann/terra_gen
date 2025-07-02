/* eslint-disable @typescript-eslint/no-explicit-any */

type Covariant<T> = () => T;
type Contravariant<T> = (value: T) => void;

export interface TypeRange<LB = never, UB = unknown> {
    _lb: Contravariant<LB>;
    _ub: Covariant<UB>;
}

export type TypeRange_LB<TR extends TypeRange> = Parameters<TR['_lb']>[0];
export type TypeRange_UB<TR extends TypeRange> = ReturnType<TR['_ub']>;

export type IsAny<T> = 0 extends 1 & T ? true : false;
export type IsNever<T> = [T] extends [never] ? true : false;

export type Extends<A1, A2> =
    IsAny<A2> extends true 
        ? true
        : IsNever<A1> extends true 
            ? true
            : IsNever<A2> extends true 
                ? false
                : A1 extends A2
                    ? true
                    : false

export type InBounds<T, LB, UB> = Extends<LB, T> extends true 
    ? Extends<T, UB> extends true 
        ? true 
        : false 
    : false

export type Equals<A1, A2> =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    Extends<(Extends<<T>() => T, A2> extends true ? true : false), (<T>() => T extends A1 ? true : false)> extends true
    ? true
    : false

type AnyIsEqual<T1, T2> = T1 extends T2
  ? Equals<T1, T2> extends true
    ? true
    : never
  : never;

export type IsTuple<T extends readonly any[]> = number extends T['length']
  ? false
  : true;

export type TupleKeys<T extends readonly any[]> = Exclude<
  keyof T,
  keyof any[]
>

export type Primitive = null | undefined | string | number | boolean | symbol | bigint;
export type BrowserNativeObject = Date | FileList | File;
export type ArrayKey = number

export type IsAtomic<T> = IsAny<T> extends true ? true : IsNever<T> extends true ? true : T extends Primitive ? true : T extends BrowserNativeObject ? true : false;

type FieldStringPathImpl<K extends string | number, T, TR extends TypeRange, TraversedTypes> = 
  IsAtomic<T> extends true
      ? (InBounds<T, TypeRange_LB<TR>, TypeRange_UB<TR>> extends true ? `.${K}` : never)
      : // Check so that we don't recurse into the same type
        // by ensuring that the types are mutually assignable
        // mutually required to avoid false positives of subtypes
        true extends AnyIsEqual<TraversedTypes, T>
        ? (InBounds<T, TypeRange_LB<TR>, TypeRange_UB<TR>> extends true ? `.${K}` : never)
        : (InBounds<T, TypeRange_LB<TR>, TypeRange_UB<TR>> extends true ? `.${K}` : never) | `.${K}${FieldStringPathInternal<T, TR, TraversedTypes | T>}`;

type FieldStringPathInternal<T, TR extends TypeRange, TraversedTypes = T> =
  T extends readonly (infer V)[]
    ? IsTuple<T> extends true
      ? {
          [K in TupleKeys<T>]-?: FieldStringPathImpl<K & string, T[K], TR, TraversedTypes>;
        }[TupleKeys<T>]
      : FieldStringPathImpl<ArrayKey, V, TR, TraversedTypes>
    : {
        [K in keyof T]-?: FieldStringPathImpl<K & string, T[K], TR, TraversedTypes>;
      }[keyof T];


export type FieldStringPath<T, TR extends TypeRange> = T extends any ? FieldStringPathInternal<T, TR> : never;
export type StringPath<T = unknown, TR extends TypeRange = TypeRange> = (T extends any ? FieldStringPathInternal<T, TR> : never) | "";

export type GenericStringPathValueIn<T, P extends StringPath<T>> = P extends StringPath<T, infer TR> ? TypeRange_LB<TR> : never;
export type GenericStringPathValueOut<T, P extends StringPath<T>> = P extends StringPath<T, infer TR> ? TypeRange_UB<TR>: never;

export type StringPathValue<T, P extends StringPath<T>> = 
    T extends any
        ? P extends "" 
            ? T
            : P extends `.${infer K}.${infer R}`
                ? K extends keyof T
                    ? StringPathValue<T[K], `.${R}` & StringPath<T[K]>>
                    : K extends `${ArrayKey}`
                        ? T extends readonly (infer V)[]
                                ? StringPathValue<V, `.${R}` & StringPath<V>>
                                : never
                        : never
                : P extends `.${infer K}`
                    ? K extends keyof T
                        ? T[K]
                        : K extends `${ArrayKey}`
                            ? T extends readonly (infer V)[]
                                    ? V
                                    : never
                            : never
                    : never

    : never;

export type SubStringPath<T, P extends StringPath<T>> = 
    T extends any
    ? P extends "" 
        ? StringPath<T>
        : P extends `.${infer K}.${infer R}`
            ? K extends keyof T
                ? SubStringPath<T[K], `.${R}` & StringPath<T[K]>>
                : K extends `${ArrayKey}`
                    ? T extends readonly (infer V)[]
                            ? SubStringPath<V, `.${R}` & StringPath<V>>
                            : never
                    : never
            : P extends `.${infer K}`
                ? K extends keyof T
                    ? StringPath<T[K]>
                    : K extends `${ArrayKey}`
                        ? T extends readonly (infer V)[]
                                ? StringPath<V>
                                : never
                        : never
                : never
    : never;

export type StringPathByValue<T, TValue> = {
    [Key in StringPath<T>]: StringPathValue<T,Key> extends TValue
        ? Key
        : never;
}[StringPath<T>];

export type StringPathByExactValue<T, TValue> = StringPath<T, TypeRange<TValue, TValue>>;

export type MergeStringPath<TD, NP extends StringPath<TD>, RNP extends SubStringPath<TD, NP>> = `${NP}${RNP}` & StringPath<TD>;