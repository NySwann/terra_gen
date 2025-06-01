import { useState } from 'react';
import { AppShell, Code, Group, Text } from '@mantine/core';
import classes from './Aside.module.css';
import { useStoreValue } from '@/hooks/useStore';
import { panelStore } from '@/stores/panel';
import { EditPanel } from '@/panels/EditPanel/EditPanel';

const data = {
  'edit':  <EditPanel/>
 } as const;

export function Aside() {
  const activePanel = useStoreValue(panelStore);

  return (
    <AppShell.Aside className={classes.aside}>
      <div className={classes.asideMain}>
        {data[activePanel]}
      </div>
    </AppShell.Aside>
  );
}