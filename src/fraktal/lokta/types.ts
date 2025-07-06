/* eslint-disable @typescript-eslint/no-explicit-any */

type Covariant<T> = () => T;
type Contravariant<T> = (value: T) => void;

export interface TypeRange<LB = never, UB = unknown> {
    _setter: Contravariant<LB>;
    _getter: Covariant<UB>;
}

export type TypeRange_Set<TR extends TypeRange> = Parameters<TR['_setter']>[0];
export type TypeRange_Get<TR extends TypeRange> = ReturnType<TR['_getter']>;

export type ExactType<T> = TypeRange<T, T>;
export type SetType<T> = TypeRange<T>;
export type GetType<T> = TypeRange<never, T>;

export type IsAny<T> = 0 extends 1 & T ? true : false;
export type IsNever<T> = [T] extends [never] ? true : false;
export type IsNull<T> = [T] extends [null] ? true : false;
export type IsUndefined<T> = [undefined] extends [T] ? true : false;
export type IsUnknown<T> = (
	unknown extends T // `T` can be `unknown` or `any`
		? IsNull<T> extends false // `any` can be `null`, but `unknown` can't be
			? true
			: false
		: false
);

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

export type Inside<T, LB, UB> = Extends<LB, T> extends true 
    ? Extends<T, UB> extends true 
        ? true 
        : false 
    : false

export type InRange<T, TR extends TypeRange> = Inside<T, TypeRange_Set<TR>, TypeRange_Get<TR>>;

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

export type Primitive = string | number | boolean | symbol | bigint | null | undefined;
export type BrowserNativeObject = Date | FileList | File;
export type ArrayKey = number

export type IsAtomic<T> = 
    IsAny<T> extends true 
        ? true 
        : IsNever<T> extends true 
            ? true 
            : IsUnknown<T> extends true 
                ? true 
                : IsUndefined<T> extends true 
                    ? true 
                    : IsNull<T> extends true 
                        ? true 
                        : T extends Primitive 
                            ? true 
                            : T extends BrowserNativeObject 
                                ? true 
                                : false;

type SubPathImpl<K extends string | number, T, TR extends TypeRange, TraversedTypes> = 
    // Check so that we don't recurse into the same type
    // by ensuring that the types are mutually assignable
    // mutually required to avoid false positives of subtypes
    true extends AnyIsEqual<TraversedTypes, T>
        ? (InRange<T, TR> extends true ? `.${K}` : never)
        : (InRange<T, TR> extends true ? `.${K}` : never) | `.${K}${SubPath<T, TR, TraversedTypes | T>}`;

type SubPathSplit<T, TR extends TypeRange, TraversedTypes = T> =
    IsAtomic<T> extends true 
        ? never
        : T extends readonly (infer V)[]
            ? IsTuple<T> extends true
                ? {
                    [K in TupleKeys<T>]-?: SubPathImpl<K & string, T[K], TR, TraversedTypes>;
                    }[TupleKeys<T>]
                : SubPathImpl<ArrayKey, V, TR, TraversedTypes>
            : { [K in keyof T]-?: SubPathImpl<K & string, T[K], TR, TraversedTypes> }[keyof T];

export type SubPath<T, TR extends TypeRange, TraversedTypes = T> = T extends any ? SubPathSplit<T, TR, TraversedTypes> : never;
export type Path<T, TR extends TypeRange = TypeRange> = IsUnknown<T> extends true ? never : (SubPath<T, TR> | (InRange<T, TR> extends true ? "" : never));

export type PathData<T, P extends Path<T>> =
    IsUnknown<T> extends true 
        ? unknown
        : T extends any
            ? P extends "" 
                ? T
                : P extends `.${infer K}.${infer R}`
                    ? K extends keyof T
                        ? PathData<T[K], `.${R}` & Path<T[K]>>
                        : K extends `${ArrayKey}`
                            ? T extends readonly (infer V)[]
                                    ? PathData<V, `.${R}` & Path<V>>
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