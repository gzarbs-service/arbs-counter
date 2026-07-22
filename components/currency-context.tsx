'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type Currency = 'EUR' | 'USD'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const STORAGE_KEY = 'gz-currency'

function getInitialCurrency(): Currency {
  if (typeof window === 'undefined') return 'EUR'
  const saved = window.localStorage.getItem(STORAGE_KEY) as Currency | null
  return saved === 'EUR' || saved === 'USD' ? saved : 'EUR'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(getInitialCurrency)

  const setCurrency = (value: Currency) => {
    setCurrencyState(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
