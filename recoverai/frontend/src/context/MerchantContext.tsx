"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface MerchantContextType {
  merchantId: string | null;
  setMerchantId: (id: string) => void;
  isReady: boolean;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

const DEFAULT_MERCHANT_ID = process.env.NEXT_PUBLIC_MERCHANT_ID || "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchantId, setMerchantIdState] = useState<string | null>(DEFAULT_MERCHANT_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("merchant_id");
      if (stored && stored !== DEFAULT_MERCHANT_ID) {
        setMerchantIdState(stored);
      } else if (!stored) {
        localStorage.setItem("merchant_id", DEFAULT_MERCHANT_ID);
      }
    } catch {
      // Ignore localStorage unavailable
    } finally {
      setIsReady(true);
    }
  }, []);

  const setMerchantId = (id: string) => {
    try {
      localStorage.setItem("merchant_id", id);
    } catch {
      // Ignore localStorage unavailable
    }
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
