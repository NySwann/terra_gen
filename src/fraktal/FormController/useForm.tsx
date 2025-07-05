import { type Ref, useCallback, useEffect, useRef, useImperativeHandle } from "react";
import { make_tree, type Tree } from "../lokta/tree";
import type { BrowserNativeObject, IsAny, Primitive, Path, PathValue } from "../lokta/types";

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

type FormContent = unknown;

type DirtyFields<FC extends FormContent> = Partial<
  Readonly<DeepMap<DeepPartial<FC>, boolean>>
>;

export interface FieldErrors<T extends FormContent = FormContent> { }

type DefaultValues<FC extends FormContent> = DeepPartial<FC>;

interface ValidationResolver<FC extends FormContent> { }

type OnFormValidHandler<FC extends FormContent> = (
  data: FC,
  dirtyFields: DirtyFields<FC>,
  event?: React.BaseSyntheticEvent
) => unknown | Promise<unknown>;

type OnFormInvalidHandler<FC extends FormContent> = (
  errors: FieldErrors<FC>,
  event?: React.BaseSyntheticEvent,
) => unknown | Promise<unknown>;

type OnFormSave<FC extends FormContent> = (
  onValid: OnFormValidHandler<FC>,
  onInvalid?: OnFormInvalidHandler<FC>
) => void;

type FormResetAction<FC extends FormContent> = (defaultValues?: DefaultValues<FC>) => void;
type FormTriggerAction<FC extends FormContent> = (
  name: Path<FC>,
  options?:
    | Partial<{
      shouldFocus: boolean;
    }>

) => Promise<boolean>;

type FormSetLoadingAction = (loading: boolean) => void;
type FormSetReadOnlyAction = (loading: boolean) => void;
type FormGetContentAction<FC extends FormContent> = () => FC;

type FormGetValueAction<FC extends FormContent> = <N extends Path<FC>>(
  name: N
) => PathValue<FC, N>;

type FormSetValueAction<TFormContent extends FormContent> = <
  SP extends Path<TFormContent> = Path<TFormContent>,
>(
  name: SP,
  value: PathValue<TFormContent, SP>,
  options?: SetValueConfig
) => void;
type FormGetStateAction<FC extends FormContent> = () => FormState<FC>;

export type FormHandleRef<T extends FormContent> = FormHandle<T>;

interface UseFormProps<T extends FormContent> {
  validationResolver?: ValidationResolver<T>;
  defaultValues?: DefaultValues<NoInfer<T>>;
  ref?: Ref<FormHandleRef<T>>;
  isLoading?: boolean;
  isReadOnly?: boolean;
  name?: string;
}

export interface FormState<FC extends FormContent> {
  dirtyFields: Partial<Readonly<DeepMap<DeepPartial<FC>, boolean>>>;
  validationResolver?: ValidationResolver<FC>;
  defaultValues?: DefaultValues<NoInfer<FC>>;
  isValid: boolean;
  isLoading: boolean;
  isReadOnly: boolean;
  firstRender: boolean;
  errors: FieldErrors<FC>;
}

interface _FormInternal<T extends FormContent> {
  name?: string;
  state: FormState<T>;
  subject: Subject<FormState<T>>;
  tree: Tree<T>;
}

export interface FormHandle<T extends FormContent> {
  save: OnFormSave<T>;
  reset: FormResetAction<T>;
  trigger: FormTriggerAction<T>;
  setLoading: FormSetLoadingAction;
  setReadOnly: FormSetReadOnlyAction;
  getValue: FormGetValueAction<T>;
  setValue: FormSetValueAction<T>;
  getState: FormGetStateAction<T>;

  /* internal state, do not access directly, useFormState */
  _internal: _FormInternal<T>;
}

const useFormStateWatcher = <FC extends FormContent>(
  handle: FormHandle<FC>,
  defaultValues?: DefaultValues<NoInfer<FC>>
) => {
  const updateState = useCallback(
    (newState: Partial<FormState<FC>>) => {
      let needsUpdate = false;

      if (
        !isNil(newState.dirtyFields) &&
        handle._internal.state.dirtyFields !== newState.dirtyFields
      ) {
        handle._internal.state = { ...handle._internal.state, dirtyFields: newState.dirtyFields };
        needsUpdate = true;
      }

      if (!isNil(newState.isValid) && handle._internal.state.isValid !== newState.isValid) {
        handle._internal.state = { ...handle._internal.state, isValid: newState.isValid };
        needsUpdate = true;
      }

      if (needsUpdate) {
        handle._internal.subject.next(handle._internal.state);
      }
    },
    [handle]
  );

  // useEffect(() => {
  //   const subscription = handle.control._subjects.state.subscribe({
  //     next: updateState,
  //   });

  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, [handle.control._subjects.state, updateState]);

  const firstRender = handle._internal.state.firstRender;

  if (firstRender) {
    handle._internal.state = { ...handle._internal.state, firstRender: false };
  }

  if (handle._internal.state.defaultValues !== defaultValues) {
    if (firstRender) {
      throw new Error('defaultValues ne devraient pas changer après le first render');
    }
    handle._internal.state = { ...handle._internal.state, defaultValues };
    // handle._internal.formProps.reset(structuredClone(defaultValues));
  }

  useEffect(() => {
    if (!firstRender) {
      handle._internal.subject.next(handle._internal.state);
    }
  }, [handle._internal.state, handle._internal.subject, firstRender]);
};

const _resetForm = <FC extends FormContent>(
  internal: _FormInternal<FC>,
  newDefaultValues: DefaultValues<FC> | undefined
) => {
  // if (isNil(newDefaultValues)) {
  //   internal.formProps.reset(structuredClone(internal.state.defaultValues));
  //   return;
  // }

  // internal.formProps.reset(structuredClone(newDefaultValues));
  // internal.state = { ...internal.state, defaultValues: newDefaultValues };

  // internal.subject.next(internal.state);
};

const _saveForm = <FC extends FormContent>(
  internal: _FormInternal<FC>,
  onValid: OnFormValidHandler<FC>,
  onInvalid?: OnFormInvalidHandler<FC>
) => {
  // return internal.formProps.handleSubmit(
  //   (data, event) => onValid(data, internal.state.dirtyFields, event),
  //   (errors) => {
  //     console.warn(internal.name, internal.id, internal.formProps.getValues());
  //     console.warn(internal.name, internal.id, errors);
  //     onInvalid?.(errors);
  //   }
  // )();
};

const _triggerForm = <FC extends FormContent>(
  internal: _FormInternal<FC>,
  name: Path<FC>,
  options?:
    | Partial<{
      shouldFocus: boolean;
    }>

) => {
  return Promise.resolve(false);
  //return internal.formProps.trigger(name, options);
};

const _setLoading = <FC extends FormContent>(
  internal: _FormInternal<FC>,
  loading: boolean
) => {
  internal.state = { ...internal.state, isLoading: loading };
  internal.subject.next(internal.state);
};

const _setReadOnly = <FC extends FormContent>(
  internal: _FormInternal<FC>,
  readOnly: boolean
) => {
  internal.state = { ...internal.state, isReadOnly: readOnly };
  internal.subject.next(internal.state);
};

const _getValue = <FC extends FormContent, N extends Path<FC>>(
  internal: _FormInternal<FC>,
  name: N
) => {
  return internal.tree.get_data(name)
};

const _setValue = <FC extends FormContent, SP extends Path<FC> = Path<FC>>(
  internal: _FormInternal<FC>,
  name: SP,
  value: PathValue<FC, SP>,
  options?: SetValueConfig
) => {
  return internal.tree.set_data(name, value)
};

const _getState = <FC extends FormContent>(
  internal: _FormInternal<FC>
): FormState<FC> => {
  return internal.state;
};

const _createInternal = <FC extends FormContent>(
  validationResolver: ValidationResolver<FC> | undefined,
  defaultValues: DefaultValues<FC> | undefined,
  isLoading: boolean,
  isReadOnly: boolean,
  name?: string
): _FormInternal<FC> => {
  return {
    tree: make_tree<FC>(defaultValues),
    name,
    state: {
      isValid: false,
      isLoading,
      isReadOnly,
      dirtyFields: {},
      defaultValues,
      validationResolver,
      firstRender: true,
      errors: {},
    },
  };
};

const _createHandle = <FC extends FormContent>(
  internal: _FormInternal<FC>
): FormHandle<FC> => {
  return {
    reset: (newDefaultValues) => { _resetForm(internal, newDefaultValues); },
    save: (onValid, onInvalid) => { _saveForm(internal, onValid, onInvalid); },
    trigger: (name, options) => _triggerForm(internal, name, options),
    setLoading: (loading: boolean) => { _setLoading(internal, loading); },
    setReadOnly: (readOnly: boolean) => { _setReadOnly(internal, readOnly); },
    getValue: (name) => _getValue(internal, name),
    setValue: (name, value, options) => _setValue(internal, name, value, options),
    getState: () => _getState(internal),
    _internal: internal,
  };
};

export const useForm = <FC extends FormContent>({
  validationResolver,
  defaultValues,
  ref,
  isLoading = false,
  isReadOnly = true,
  name,
}: UseFormProps<FC>): FormHandle<FC> => {
  const handle: FormHandle<FC> = useRef(
    _createHandle(_createInternal(validationResolver, defaultValues, isLoading, isReadOnly, name))
  ).current;

  useImperativeHandle(ref, () => handle, [handle]);

  useFormStateWatcher(handle, defaultValues);

  return handle;
};
