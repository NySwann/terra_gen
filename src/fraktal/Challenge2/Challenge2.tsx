

import { Button } from "@mantine/core";
import { createContext, PropsWithChildren, useCallback, use, useMemo, useState } from "react";

interface ChallengeContextData {
    value: number,
    setValue: (newValue: number) => void;
}

export const ChallengeContext = createContext<ChallengeContextData | undefined>(undefined);

const Challenge = ({ children }: PropsWithChildren) => {
    const [value, setValue] = useState(0);

    console.log("Challenge");

    const contextValue = useMemo<ChallengeContextData>(() => ({
        value,
        setValue
    }), [value]);

    return <ChallengeContext value={contextValue}>{children}</ChallengeContext>;
}

const useChallenge = () => {
    const contextValue = use(ChallengeContext);

    if (!contextValue) {
        throw new Error("Missing ChallengeContext.Provider");
    }

    return contextValue;
}

const Incrementer = () => {
    const challenge = useChallenge();

    const increment = useCallback(() => {
        challenge.setValue(challenge.value + 1)
    }, [challenge]);

    console.log("Incrementer");

    return <Button onClick={increment}>Inc</Button>
}

const Displayer = () => {
    const challenge = useChallenge();

    console.log("Displayer");

    return <>Val: {challenge.value}</>
}

const Child1 = () => {
    console.log("Child1");

    return <Incrementer />
}

const Child2 = () => {
    console.log("Child2");

    return <Displayer />
}

const Parent = () => {
    console.log("Parent");

    return <><Child1 /><Child2 /></>
}

export const Root = () => {
    return <Challenge><Parent /></Challenge>;
}