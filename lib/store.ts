"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type FileConfig = {
  sheetName: string
  headerRow: number
  barcodeColumn: string
  quantityColumn: string
}

type ScannedItem = {
  barcode: string
  quantity: number
}

type ShipmentStore = {
  fileConfig: FileConfig | null
  setFileConfig: (config: FileConfig) => void
  clearFileConfig: () => void
  scannedItems: ScannedItem[]
  setScannedItems: (items: ScannedItem[]) => void
  addScannedItem: (item: ScannedItem) => void
  progressName: string
  setProgressName: (name: string) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const useShipmentStore = create<ShipmentStore>()(
  persist(
    (set) => ({
      fileConfig: null,
      setFileConfig: (config) => set({ fileConfig: config }),
      clearFileConfig: () => set({ fileConfig: null }),
      scannedItems: [],
      setScannedItems: (items) => set({ scannedItems: items }),
      addScannedItem: (item) => set((state) => ({ scannedItems: [...state.scannedItems, item] })),
      progressName: "",
      setProgressName: (name) => set({ progressName: name }),
      activeTab: "upload",
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "shipment-verification-storage",
    },
  ),
)
