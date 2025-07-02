

import { useCallback, useEffect, useState } from 'react';
import type { Node, Node_NodeValue } from '../lokta/tree';

interface UseNodeValueProps<NH extends Node> {
  nodeHandle: NH,
  child: boolean;
}

export const useNodeValue = <NH extends Node>({
  nodeHandle,
  child
}: UseNodeValueProps<NH>): Node_NodeValue<NH> => {
  const getValue = useCallback(() => nodeHandle.get_value(), [nodeHandle]);

  const [value, setValue] = useState<Node_NodeValue<NH>>(getValue());

  useEffect(() => {
    setValue(getValue());

    const listener = nodeHandle.add_listener(child, {
      on_events: (events) => {
        if (child) {
          setValue(getValue());

          return;
        }

        for (const e of events) {
          if (e.string_path === nodeHandle.string_path) {
            setValue(getValue());
          }
        }
      }
    })

    return () => { nodeHandle.rem_listener(listener); };
  }, [child, getValue, nodeHandle]
  );

  return value;
};
