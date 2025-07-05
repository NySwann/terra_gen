import { TextInput } from '@mantine/core';
import { type ChangeEventHandler, useCallback } from 'react';
import type { Node } from '../lokta/tree';
import { identity, useNodeValue } from './useNodeValue';
import type { FormInputBaseProps } from './FormInputBase';

interface Props extends FormInputBaseProps {
  node: Node<string>;
}

function FormInputText({
  node,
  label
}: Props) {
  const value = useNodeValue({
    node,
    child: false,
    transform: identity
  });

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((newValue) => {
    node.set_value(newValue.target.value);
  }, [node])

  return <TextInput value={value} onChange={onChange} label={label ?? node.string_path} />
};

export { FormInputText };

