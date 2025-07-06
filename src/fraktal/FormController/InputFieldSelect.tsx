import { Select, type ComboboxItem } from '@mantine/core';
import { useCallback } from 'react';
import type { ReactiveNode } from '../lokta/tree';
import { identity, useReactiveNodeData } from './useReactiveNodeData';
import type { InputFieldBaseProps } from './InputFieldBase';

interface Props<T extends string> extends InputFieldBaseProps {
  node: ReactiveNode<T, { error: string } | undefined>;
  options: readonly T[]
}

function InputFieldSelect<T extends string>({
  node,
  options,
  label
}: Props<T>) {
  const value = useReactiveNodeData({
    node,
    child: false,
    transform: identity
  });

  const onChange = useCallback((_: unknown, newValue: ComboboxItem) => {
    node.set_data(newValue.value as T);
  }, [node])

  return <Select value={value} onChange={onChange} data={options} label={label ?? node.string_path} />
};

export { InputFieldSelect };

