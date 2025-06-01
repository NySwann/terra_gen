import { useState } from 'react';
import {
  Icon2fa,
  IconBellRinging,
  IconDatabaseImport,
  IconFingerprint,
  IconKey,
  IconLogout,
  IconPencil,
  IconReceipt2,
  IconSettings,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { AppShell, Code, Group, Text } from '@mantine/core';
import classes from './Navbar.module.css';
import { useStoreValue } from '@/hooks/useStore';
import { panelStore } from '@/stores/panel';

const data = [
  { link: 'edit', label: 'Edit', icon: IconPencil} as const,
] as const;

export function Navbar() {
  const activePanel = useStoreValue(panelStore);

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.link === activePanel || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        panelStore.setValue(item.link);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <AppShell.Navbar className={classes.navbar}>
      <div className={classes.navbarMain}>
        {/* <Group className={classes.header} justify="space-between">
          <Text>Logo</Text>
          <Code fw={700}>v3.1.2</Code>
        </Group> */}
        {links}
      </div>

      {/* <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconSwitchHorizontal className={classes.linkIcon} stroke={1.5} />
          <span>Change account</span>
        </a>

        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div> */}
    </AppShell.Navbar>
  );
}