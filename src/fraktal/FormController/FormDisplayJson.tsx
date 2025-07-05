import type { GetOnlyNode } from '../lokta/tree';
import { useNodeValue } from './useNodeValue';
import { JsonInput } from '@mantine/core';

interface Props {
  node: GetOnlyNode;
}

const FormDisplayJson = ({
  node
}: Props) => {
  const value = useNodeValue({
    node: node,
    child: true,
    transform: (v) => JSON.stringify(v, null, 2)
  });

  return <JsonInput value={value} autosize minRows={4} minLength={200} />
};

export { FormDisplayJson };

