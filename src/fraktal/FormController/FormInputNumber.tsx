import { NumberInput } from '@mantine/core';
import type { Node } from '../lokta/tree';
import { identity, useNodeValue } from './useNodeValue';
import { useCallback } from 'react';
import type { FormInputBaseProps } from './FormInputBase';

interface Props extends FormInputBaseProps {
  node: Node<number>;
}

function FormInputNumber({
  node,
  label
}: Props) {
  const value = useNodeValue({
    node,
    child: false,
    transform: identity
  });

  const onChange = useCallback((newValue: number | string) => {
    node.set_value(Number(newValue));
  }, [node]);

  return <NumberInput value={value} onChange={onChange} label={label ?? node.string_path} />
};

export { FormInputNumber };

