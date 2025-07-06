

import { useCallback, useEffect, useState } from 'react';
import type { GetOnlyNode, NodeError } from '../lokta/tree';

export function identity<T>(v: T): T {
  return v;
}

interface Props {
  node: GetOnlyNode;
}

export function useNodeError({
  node,
}: Props): NodeError {
  const getError = useCallback(() => node.get_error(), [node]);

  const [error, setError] = useState(getError());

  useEffect(() => {
    const listener = node.add_listener(false, {
      on_events: (events) => {
        const error_events = events.filter(e => e.type === "error_change");

        console.log(error_events);
        console.log(node.string_path);

        if (error_events.length) {
          for (const e of events) {
            if (e.string_path === node.string_path) {
              setError(getError());
            }
          }
        }
      }
    })

    return () => { node.rem_listener(listener); };
  }, [getError, node]
  );

  console.log(error);

  return error;
};
