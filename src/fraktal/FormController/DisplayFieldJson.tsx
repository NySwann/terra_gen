import type { ReactiveNodeGetOnly } from '../lokta/tree';
import { useReactiveNodeData } from './useReactiveNodeData';
import { JsonInput } from '@mantine/core';

interface Props {
  node: ReactiveNodeGetOnly;
}

const DisplayFieldJson = ({
  node
}: Props) => {
  const data = useReactiveNodeData({
    node,
    child: true,
    transform: (v) => JSON.stringify(v, null, 2)
  });

  return <JsonInput value={data} autosize minRows={4} minLength={200} />
};

export { DisplayFieldJson };

