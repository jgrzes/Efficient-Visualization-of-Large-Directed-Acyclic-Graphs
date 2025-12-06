import { useRef, useContext, useEffect } from "react";
import { AppContext } from "../App";

// export function usePageVisibility(onChange: (visible: boolean) => void) {
//     useEffect(() => {
//         const handleVisibility = () => onChange(!document.hidden);
//         document.addEventListener("visibilitychange", handleVisibility);
//         return () => document.removeEventListener("visibilitychange", handleVisibility);
//     }, [onChange]);
// }

export function useStartKeepAlive(endpoint: string, intervalMs = 10000) {
    const appContext = useContext(AppContext);
    const uuid = appContext?.currentGraphUUID ?? null;

    const uuidRef = useRef(uuid);
    uuidRef.current = uuid;        // always keep it updated

    const sendKeepAlive = (type = "interval") => {
        fetch(endpoint, {
            method: "POST", 
            keepalive: true, 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({
                date: Date.now(), 
                type, 
                uuid: uuidRef.current
            }), 
        }).catch((err) => {
            console.error("Keepalive failed: ", err);
        })
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                sendKeepAlive("hidden");
            } else {
                sendKeepAlive("visible");
            }
        };

        const handleUnload = () => {
            // if (event?.persisted) return;
            // console.log("Page is unloading - likely tab close or refresh");
            sendKeepAlive("closed");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleUnload);
        window.addEventListener("pagehide", handleUnload);
        
        handleVisibilityChange();
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleUnload);
            window.removeEventListener("pagehide", handleUnload);
        };
    }, [endpoint]);

    useEffect(() => {
        console.log("Keepalive sees UUID:", uuidRef.current);
    }, [uuid]);

    useEffect(() => {
        const id = window.setInterval(() => {
            // fetch(endpoint, {
            //     method: "POST",
            //     keepalive: true,
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({
            //         date: Date.now(),
            //         uuid: uuidRef.current,
            //     }),
            // });
            if (!document.hidden) {
                sendKeepAlive();
            }
        }, intervalMs);

        console.log("Keepalive interval started");

        return () => {
            clearInterval(id);
            console.log("Keepalive interval stopped");
        };
    }, [endpoint, intervalMs]);

    // useEffect(() => {
    //     const handleUnload = () => {
    //         const payload = JSON.stringify({
    //             date: Date.now(), 
    //             type: "closed", 
    //             uuid: uuidRef.current, 
    //         });

    //         const blob = new Blob([payload], {type: "application/json"});
    //         navigator.sendBeacon(endpoint, blob);
    //     };

    //     window.addEventListener("beforeunload", handleUnload);
    //     window.addEventListener("pagehide", handleUnload);

    //     return () => {
    //         window.removeEventListener("beforeunload", handleUnload);
    //         window.removeEventListener("pagehide", handleUnload);
    //     };
    // }, [endpoint]);
}
