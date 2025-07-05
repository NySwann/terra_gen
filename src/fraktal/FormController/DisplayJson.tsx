import ReactJson from 'react-json-view';
import type { Node } from '../lokta/tree';
import { useNodeValue } from './useNodeValue';

interface DisplayJsonProps<NH extends Node> {
  nodeHandle: NH;
}

const FormDisplayJson = <NH extends Node>({
  nodeHandle
}: DisplayJsonProps<NH>) => {
  const value = useNodeValue({
    nodeHandle,
    child: false
  });

  return <ReactJson src={value} />
};

export { FormDisplayJson };

