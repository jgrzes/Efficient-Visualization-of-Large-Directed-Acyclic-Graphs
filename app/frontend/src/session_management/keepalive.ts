import { useRef, useContext } from "react"
import { AppContext } from "../App";

let keepaliveInterval: number | null = null;

export function startKeepAlive(
    keepaliveEndpoint: string, intervalMs: number = 10_000
) {
    const appContext = useContext(AppContext);
    const currentGraphUUIDRef = useRef(appContext?.currentGraphUUID);
    if (keepaliveInterval !== null) return;

    keepaliveInterval = window.setInterval(async () => {
        try {
            await fetch(keepaliveEndpoint, {
                method: "POST", 
                keepalive: true, 
                headers: {
                    "Content-Type": "application/json"
                }, 
                body: JSON.stringify({ date: Date.now(), uuid: currentGraphUUIDRef.current })
            });
        } catch (err) {
            console.warn("Keepalive failed: ", err, " that might lead to backend desync");
        }
    }, intervalMs);

    console.log("Keepalive started");
}

export function stopKeepAlive() {
    if (keepaliveInterval !== null) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
        console.log("Keepalive stopped");
    }
}