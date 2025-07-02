import { useMemo } from 'react';

import { TreeValue } from '../lokta/tree';
import { StringPath, StringPath_InValue } from '../lokta/types';
import { FormHandle } from './useForm';

interface UseFormFieldProps<FC extends TreeValue, SP extends StringPath<FC>> {
  formHandle: FormHandle<FC>;
  path: SP
}

export const useFormField = <FC extends TreeValue, SP extends StringPath<FC>>({
  formHandle,
  path
}: UseFormFieldProps<FC, SP>) => {
  const control = useMemo(() => {
    const node = formHandle._internal.tree.get_node(path);

    return {
      getValue: () => node.get_value(),
      setValue: (value: StringPath_InValue<SP>) => { node.set_value(value); }
    }
  }, [formHandle._internal.tree, path]
  );

  return control;
};
