import { test, expectTypeOf } from 'vitest';

import type { Node } from "./tree";
import type { StringPath, StringPathValue, MergeStringPath, SubStringPath } from "./types";

interface User {
    name: string;
}

interface Rating {
    value: number;
    content: string;
    user: User;
}

interface Article {
    name: string;
    price: number;
    ratings: Rating[];
}

interface FormValue1 {
    articles: Article[];
}

type p = MergeStringPath<FormValue1, ".articles", ".0">;
type f = StringPathValue<FormValue1, MergeStringPath<FormValue1, ".articles", ".0">>;

interface _t {
    user: {
        name: string;
        lol: {
            x: string;
            a: { x: { z: 2 } }[];
            b: [number, string];
        };
        y: string;
    },
    user2: {
        name: string;
        lol: {
            x: string;
            a: { x: { z: 2 } }[];
            b: [number, string];
        };
    },
    x: unknown;
    y: never;
    z: any;
}

type _a2 = StringPath<_t>;
type _c2 = StringPathValue<_t, ".user">
type _d2 = StringPathValue<_t, ".user.lol">
type _e2 = StringPathValue<_t, ".user.lol.b">
type _g2 = StringPathValue<_t, ".user.lol.b.1">
type _h2 = StringPathValue<_t, ".user.lol.b.0">
type _f2 = MergeStringPath<_t, ".user" | ".user2", ".lol" | ".y">;
type _k2 = StringPathValue<_t, ".user.lol.a.0">
type _l2 = StringPathValue<_t, ".user.lol.a.0.x">
type _m2 = StringPathValue<_t, ".user.lol.a.0.x.z" | ".user.lol.a.0">
type _z2 = SubStringPath<_t, ".user.lol.a.0">
type _x2 = SubStringPath<_t, ".user.lol.a">
type _w2 = SubStringPath<_t, ".user.lol.b">

export type JsonPrimative1 = string | number | boolean | null;
export type JsonArray1 = Json1[];
export interface JsonObject1 { [key: string]: Json1 }
export type JsonComposite1 = JsonArray1 | JsonObject1;
export type Json1 = JsonPrimative1 | JsonComposite1;

// type _arrr = Path<Json1>;
// type _arrr2 = StringPath<Json1>;

// type _zz2 = StringPathByExactValue<_t, number>;
// type _zzz2 = StringPathValue<_t, _zz2>;

// type _a22 = AddValues<_t, StringPath<_t>>;
// type _a222 = FilterByValue<_t, StringPath<_t>, AddValues<_t, StringPath<_t>>, number>;

// type _a333 = StringPath<_t, 2, number>;
// type _a3331 = StringPath<_t>;
// type _a3332 = StringPath<_t, never, unknown>;
// type _a3333 = StringPath<_t, string, string | number>;
// type _a3334 = StringPath<_t, string, string>;

// const t: _t = 3 as unknown as _t;

// const b = _get_v(t, ".user.lol.b.0");
// const b1 = _get_v(t, ".user.lol.a.1.x.z");

// const c = _faaa(t, ".user.lol.b.0");

// function _get_v<T, P extends StringPathByExactValue<T, number>>(_t: T, _p: P): StringPathValue<T, P> {
//     const a: StringPathValue<T, StringPathByExactValue<T, number>> = "mdr";

//     return a;
// }

// type _ax1 = Extends<TypeRange<string, string>, TypeRange>;
// type _ax2 = Extends<TypeRange<string, string>, TypeRange<1 | 2, number>>;
// type _ax3 = Extends<TypeRange<1 | 2, 1 | 2>, TypeRange<1 | 2, number>>;
// type _ax4 = Extends<TypeRange<1, 1>, TypeRange<1 | 2, number>>;

// type _ax4 = TypeRange_LB<TypeRange<1 | 2, number>>;
// type _ax4 = TypeRange_UB<TypeRange<1 | 2, number>>;

/*

type z1 = Extends<never, FormContent>;
type z2 = Extends<FormContent, any>;

type z2 = Extends<never, any>;
type z2 = Extends<any, never>;

type G1<T> = InBounds<T, string, string> extends true ? "" : never;
type G2<T> = InBounds<T, never, any> extends true ? "" : never;

const f = <FC extends FormContent & any>() => {
    let a: G1<FC>;
    a = "";
    let b: G2<FC> = a;
    b = "";
}

type f = IsAtomic<number>;
type f = IsAtomic<never>;
type f = IsAtomic<any>;
type f = IsAtomic<Date>;
type f = IsAtomic<{}>;
type f = IsAtomic<1>;
type f = IsAtomic<number[]>;
type f = IsAtomic<never[]>;
type f = IsAtomic<any[]>;

type f = InBounds<any, never, any>;
type f = InBounds<any, any, any>;
type f = InBounds<any, never, never>;
type f = InBounds<never, never, any>;
type f = InBounds<never, any, any>;
type f = InBounds<{}, never, unknown>;

type f = IsAtomic<{
    name: string;
    lol: {
        x: string;
        a: {x: {z: 2}}[];
        b: [number, string];
    };
    y: string;
}>;

type f = 1 extends number ? true : false;
type f = any extends unknown ? true : false;
type f = unknown extends any ? true : false;
type f = 1 extends unknown ? true : false;
type f = 1 extends any ? true : false;

*/

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const _a: Node<"1" | "2"> = undefined as any;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const _b: Node<"1"> = undefined as any;


const _c: Node<"1"> = _b;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _d: Node<"1"> = _a;

test('my types work properly', () => {
    expectTypeOf<SubStringPath<_t, ".user.lol.b">>().toEqualTypeOf<".0" | ".1">();

    expectTypeOf<StringPathValue<_t, ".user.lol.a.0.x.z" | ".user.lol.a.0">>().toEqualTypeOf<2 | {
        x: {
            z: 2;
        };
    }>()

    expectTypeOf<MergeStringPath<_t, ".user" | ".user2", ".lol" | ".y">>().toEqualTypeOf<".user.y" | ".user.lol" | ".user2.lol">();

    expectTypeOf<MergeStringPath<_t, ".user" | ".user2", ".lol" | ".y">>().toEqualTypeOf<".user.y" | ".user.lol" | ".user2.lol">();

    expectTypeOf<Node<"1">>().toEqualTypeOf<Node<"1">>();

    //expectTypeOf<Node<"1">>().not.toMatchTypeOf<Node<"1" | "2">>();
})