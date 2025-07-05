import { TextInput } from '@mantine/core';
import { type ChangeEventHandler, useCallback } from 'react';
import type { Node } from '../lokta/tree';
import { useNodeValue } from './useNodeValue';
interface InputTextProps {
  nodeHandle: Node<string>;
}

const FormInputText = ({
  nodeHandle
}: InputTextProps) => {
  const value = useNodeValue({
    nodeHandle,
    child: false
  });

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((newValue) => {
    nodeHandle.set_value(newValue.target.value);
  }, [nodeHandle])

  return <TextInput value={value} onChange={onChange} />
};

export { FormInputText };

