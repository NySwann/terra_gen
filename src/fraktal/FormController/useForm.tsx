import { type Ref, useCallback, useEffect, useRef, useImperativeHandle } from "react";
import { make_tree, type ReactiveTree, type Tree, type TreeErrors } from "../lokta/tree";
import type { BrowserNativeObject, IsAny, Primitive, Path, PathValue } from "../lokta/types";

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
  tree: ReactiveTree<T, { isReadOnly: boolean }, { error: string } | undefined>;
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
  const values = internal.tree.get_node("").get_data();
  const errors = internal.state.validationResolver(values);

  internal.tree.set_node_meta_bulk(errors);

  if (Object.keys(errors).length) {
    onInvalid?.(errors);
  } else {
    onValid(values)
  }
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
    tree: make_tree<FC>(defaultValues, {}, {}),
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
