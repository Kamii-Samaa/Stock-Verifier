"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { SummaryReport } from "@/components/summary-report"
import { SavedProgress } from "@/components/saved-progress"
import { useEffect } from "react"
import { useShipmentStore } from "@/lib/store"

export default function Home() {
  const { activeTab, setActiveTab } = useShipmentStore()

  // Handle tab changes
  useEffect(() => {
    const handleTabChange = (value: string) => {
      setActiveTab(value)
    }

    // Add event listeners to tab triggers
    const tabTriggers = document.querySelectorAll('[role="tab"]')
    tabTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const value = trigger.getAttribute("data-value")
        if (value) handleTabChange(value)
      })
    })

    return () => {
      // Clean up event listeners
      tabTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", () => {})
      })
    }
  }, [setActiveTab])

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Shipment Quantity Verification</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="scan">Scan Items</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="saved">Saved Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="p-4 border rounded-md">
          <FileUpload />
        </TabsContent>

        <TabsContent value="scan" className="p-4 border rounded-md">
          <BarcodeScanner />
        </TabsContent>

        <TabsContent value="summary" className="p-4 border rounded-md">
          <SummaryReport />
        </TabsContent>

        <TabsContent value="saved" className="p-4 border rounded-md">
          <SavedProgress />
        </TabsContent>
      </Tabs>
    </main>
  )
}
