import { useRef, useContext, useEffect } from "react";
import { AppContext } from "../App";

export function useStartKeepAlive(endpoint: string, intervalMs = 10000) {
    const appContext = useContext(AppContext);
    const uuid = appContext?.currentGraphUUID ?? null;

    const uuidRef = useRef(uuid);
    uuidRef.current = uuid;        // always keep it updated

    useEffect(() => {
        console.log("Keepalive sees UUID:", uuidRef.current);
    }, [uuid]);

    useEffect(() => {
        const id = window.setInterval(() => {
            fetch(endpoint, {
                method: "POST",
                keepalive: true,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: Date.now(),
                    uuid: uuidRef.current,
                }),
            });
        }, intervalMs);

        console.log("Keepalive started");

        return () => {
            clearInterval(id);
            console.log("Keepalive stopped");
        };
    }, [endpoint, intervalMs]);
}
