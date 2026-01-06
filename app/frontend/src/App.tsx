import React, { useState } from "react";
import { AppContext } from "./context/AppContext";
import MainApp from "./MainApp";
import { useStartKeepAlive } from "./hooks/useKeepalive";
import { API_BASE } from "./graph/api/base";

const AppKeepAliveComponent = () => {
  useStartKeepAlive(`${API_BASE}/session_keepalive`, 10_000);
  return <MainApp />;
};

const App: React.FC = () => {
  const [currentGraphUUID, setCurrentGraphUUID] = useState<string | null>("");

  return (
    <AppContext.Provider value={{ currentGraphUUID, setCurrentGraphUUID }}>
      <AppKeepAliveComponent />
    </AppContext.Provider>
  );
};

export default App;
