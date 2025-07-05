import ReactJson from 'react-json-view';
import type { GetOnlyNode } from '../lokta/tree';
import { useNodeValue } from './useNodeValue';

interface Props {
  node: GetOnlyNode;
}

const FormDisplayJson = ({
  node
}: Props) => {
  const value = useNodeValue({
    node: node,
    child: false
  });

  return <ReactJson src={value as object} />
};

export { FormDisplayJson };

