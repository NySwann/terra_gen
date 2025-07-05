import { TextInput } from '@mantine/core';
import { type ChangeEventHandler, useCallback } from 'react';
import type { Node } from '../lokta/tree';
import { useNodeValue } from './useNodeValue';

interface InputTextProps {
  node: Node<string>;
}

const FormInputText = ({
  node
}: InputTextProps) => {
  const value = useNodeValue({
    node,
    child: false
  });

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((newValue) => {
    node.set_value(newValue.target.value);
  }, [node])

  return <TextInput value={value} onChange={onChange} />
};

export { FormInputText };

