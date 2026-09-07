"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface MerchantContextType {
  merchantId: string | null;
  setMerchantId: (id: string) => void;
  isReady: boolean;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchantId, setMerchantIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const defaultId = process.env.NEXT_PUBLIC_MERCHANT_ID || "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";
    const storedId = localStorage.getItem("merchant_id");
    if (storedId) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setMerchantIdState(storedId);
    } else {
      localStorage.setItem("merchant_id", defaultId);
      setMerchantIdState(defaultId);
    }
    setIsReady(true);
  }, []);

  const setMerchantId = (id: string) => {
    localStorage.setItem("merchant_id", id);
    setMerchantIdState(id);
  };

  return (
    <MerchantContext.Provider value={{ merchantId, setMerchantId, isReady }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (context === undefined) {
    throw new Error("useMerchant must be used within a MerchantProvider");
  }
  return context;
}
