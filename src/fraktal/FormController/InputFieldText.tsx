import { TextInput } from '@mantine/core';
import { type ChangeEventHandler, useCallback } from 'react';
import type { ReactiveNode } from '../lokta/tree';
import { identity, useReactiveNodeData } from './useReactiveNodeData';
import type { InputFieldBaseProps } from './InputFieldBase';
import { useReactiveNodeMeta } from './useReactiveNodeMeta';

interface Props extends InputFieldBaseProps {
  node: ReactiveNode<string, { error: string } | undefined>;
}

function InputFieldText({
  node,
  label
}: Props) {
  const value = useReactiveNodeData({
    node,
    child: false,
    transform: identity
  });

  const meta = useReactiveNodeMeta({
    node
  })

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((newValue) => {
    node.set_data(newValue.target.value);
  }, [node])

  return <TextInput value={value} onChange={onChange} label={label ?? node.string_path} error={meta?.error} />
};

export { InputFieldText };

