import { CompareValuesWithDetailedDifferences } from "./compare";
import { make_tree, type ReactiveTree } from "./tree";
import type { BrowserNativeObject, IsAny, Path, PathData, Primitive } from "./types";

export type FormContent = unknown;
export type FieldValue = unknown;

interface FormMeta { readonly: boolean }
interface FieldMeta { error?: string };

export type NonUndefined<T> = T extends undefined ? never : T;

export type ExtractObjects<T> = T extends infer U
    ? U extends object
    ? U
    : never
    : never;

export type DeepPartial<T> = T extends Primitive
    ? T | undefined
    : {
        [K in keyof T]?: ExtractObjects<T[K]> extends never
        ? T[K] | undefined
        : DeepPartial<T[K]>;
    } | undefined;

export type DeepMap<T, TValue> =
    IsAny<T> extends true
    ? any
    : T extends BrowserNativeObject
    ? TValue
    : T extends object
    ? { [K in keyof T]: DeepMap<NonUndefined<T[K]>, TValue> }
    : TValue;

type DirtyFields<FC extends FormContent> = Partial<
    Readonly<DeepMap<DeepPartial<FC>, boolean>>
>;

export type FieldErrors = Record<string, { error: string }>;

type DefaultValues<FC extends FormContent> = DeepPartial<FC>;

type FormErrors = Record<string, string>;

type FormValidator<FC extends FormContent> = (values: FC) => FormErrors;

type FormValidHandler<FC extends FormContent> = (
    data: FC,
) => void;

type FormInvalidHandler<FC extends FormContent> = (
    errors: FieldErrors,
) => void;

type FormSaver<FC extends FormContent> = (
    on_valid: FormValidHandler<FC>,
    on_invalid?: FormInvalidHandler<FC>
) => void;


interface FieldInternal {
    form: Form<unknown>;
};

export interface Field<FD extends FieldValue> {
    string_path: string;
    get_field: <FP extends Path<FD>>(string_path: FP) => Field<PathData<FD, FP>>;
    get_value: () => FD;
    set_value: (data: FD) => void;
    is_dirty: () => boolean;
    is_readonly: () => boolean;
}

export type FieldGetOnly<FV extends FieldValue = FieldValue> = Omit<Field<FV>, "set_value" | "get_node"> & {
    get_node: <FP extends Path<FV>>(string_path: FP) => FieldGetOnly<PathData<FV, FP>>
};

export type FieldSetOnly<FV extends FieldValue = FieldValue> = Omit<Field<FV>, "get_value" | "get_node"> & {
    get_node: <FP extends Path<FV>>(string_path: FP) => FieldSetOnly<PathData<FV, FP>>
};

function _get_field<FV extends FieldValue, FP extends Path<FV>>(field: Field<FV>, string_path: FP): Field<PathData<FV, FP>> {
    const node = 

    return {
        string_path,
        get_node: <RNP extends Path<NV>>(path: RNP) => _get_node_handle<NV, RNP>(tree, `${string_path}${path}` as unknown as Path<NV>),
        get_data: () => _get_node_data(tree, string_path) as PathData<NV, NP>,
        set_data: (new_data) => { _set_node_data(tree, string_path, new_data); },
        get_meta: () => _get_node_meta(tree, string_path),
        add_listener: (listen_to_child, events) => _add_listener(tree, string_path, listen_to_child, events),
        rem_listener: (listener) => { _rem_listener(tree, string_path, listener); }
    }
}

interface FormInternal {
    tree: ReactiveTree<unknown, FormMeta, NodeMeta>;
    default_values: unknown;
    validator: FormValidator<unknown>;
};

export interface Form<FC extends FormContent> {
    get_field: <NP extends Path<FC>>(string_path: NP) => Field<PathData<FC, NP>>;
    get_default_values: () => DefaultValues<FC>;
    get_dirty_fields: () => DirtyFields<FC>;
    validate: FormValidator<FC>;
    save: FormSaver<FC>;
}

function make_form<FC extends FormContent>({ default_values, validator }: { default_values: DefaultValues<FC>, validator: FormValidator<FC> }): Form<FC> {
    const internal: FormInternal = {
        tree: make_tree<DeepPartial<FC>, FormMeta, FieldMeta>(default_values, { readonly: false }, {}),
        default_values,
        validator
    }

    return {
        get_node: <NP extends Path<TD>>(path: NP) => _get_node_handle<TD, NP>(tree, path),
        get_tree_meta: () => _get_tree_meta(tree),
        set_tree_meta: (meta) => { _set_tree_meta(tree, meta); },
        get_node_meta_bulk: () => _get_node_meta_bulk(tree),
        set_node_meta_bulk: (meta) => { _set_node_meta_bulk(tree, meta); },
    };
}

export { make_form };

