import React, { createContext } from "react";

export const AppContext = createContext<{
  currentGraphUUID: string | null;
  setCurrentGraphUUID: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null);
