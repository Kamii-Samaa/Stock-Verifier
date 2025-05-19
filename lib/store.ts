"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type FileConfig = {
  sheetName: string
  headerRow: number
  barcodeColumn: string
  quantityColumn: string
}

type ShipmentStore = {
  fileConfig: FileConfig | null
  setFileConfig: (config: FileConfig) => void
  clearFileConfig: () => void
}

export const useShipmentStore = create<ShipmentStore>()(
  persist(
    (set) => ({
      fileConfig: null,
      setFileConfig: (config) => set({ fileConfig: config }),
      clearFileConfig: () => set({ fileConfig: null }),
    }),
    {
      name: "shipment-verification-storage",
    },
  ),
)
