import { Select, type ComboboxItem } from '@mantine/core';
import { useCallback } from 'react';
import type { Node } from '../lokta/tree';
import { identity, useNodeValue } from './useNodeValue';
import type { FormInputBaseProps } from './FormInputBase';

interface Props<T extends string> extends FormInputBaseProps {
  node: Node<T>;
  options: readonly T[]
}

function FormInputSelect<T extends string>({
  node,
  options,
  label
}: Props<T>) {
  const value = useNodeValue({
    node,
    child: false,
    transform: identity
  });

  const onChange = useCallback((_: unknown, newValue: ComboboxItem) => {
    node.set_value(newValue.value as T);
  }, [node])

  return <Select value={value} onChange={onChange} data={options} label={label ?? node.string_path} />
};

export { FormInputSelect };

