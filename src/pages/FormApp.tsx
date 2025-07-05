import './App.css'
import "@mantine/core/styles.css";
import { AppShell, Flex, MantineProvider, Text } from '@mantine/core';
import { theme } from '../theme';
import { Navbar } from '../components/shell/Navbar/Navbar';
import { Aside } from '@/components/shell/Aside/Aside';
import z from 'zod';

const address_schema = z.object({
  street: z.string()
})

type Address = z.infer<typeof address_schema>;

const user_schema = z.object({
  username: z.string(),
  addresses: z.array(address_schema),
});


type User = z.infer<typeof user_schema>;

function FormApp() {
  const formHandle = useForm<User>({
    validationResolver: userValidationResolver,
    defaultValues: {
      username: "Swann",
      addresses: [{
        street: "rue de nantes"
      }]
    }
  })

  return <MantineProvider theme={theme} defaultColorScheme='dark'>
    <AppShell
      header={{ height: "4%" }}
      navbar={{
        width: "20%",
        breakpoint: "md"
      }}
      aside={{
        width: "20%",
        breakpoint: "md"
      }}
      footer={{ height: "4%" }}
      padding="md"
    >
      <AppShell.Header style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text>Trixel</Text>
      </AppShell.Header>
      <Navbar />
      <AppShell.Main style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><FormInputText formHandle={formHandle} path='.username' /><FormDisplayJson formHandle={formHandle} path='' /></AppShell.Main>
      <Aside />
      <AppShell.Footer style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text id="display-fps">Zouin</Text>
      </AppShell.Footer>
    </AppShell>
  </MantineProvider>
}

export default FormApp
