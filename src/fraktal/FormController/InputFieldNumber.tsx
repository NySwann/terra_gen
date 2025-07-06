import { NumberInput } from '@mantine/core';
import type { ReactiveNode } from '../lokta/tree';
import { identity, useReactiveNodeData } from './useReactiveNodeData';
import { useCallback } from 'react';
import type { InputFieldBaseProps } from './InputFieldBase';

interface Props extends InputFieldBaseProps {
  node: ReactiveNode<number, { error: string } | undefined>;
}

function InputFieldNumber({
  node,
  label
}: Props) {
  const data = useReactiveNodeData({
    node,
    child: false,
    transform: identity
  });

  const onChange = useCallback((newValue: number | string) => {
    node.set_data(Number(newValue));
  }, [node]);

  return <NumberInput value={data} onChange={onChange} label={label ?? node.string_path} />
};

export { InputFieldNumber };

