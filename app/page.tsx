"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { SummaryReport } from "@/components/summary-report"
import { SavedProgress } from "@/components/saved-progress"
import { useState } from "react"

export default function Home() {
  const [loadedItems, setLoadedItems] = useState<any[]>([])
  const [loadedProgressName, setLoadedProgressName] = useState<string>("")

  const handleLoadProgress = (items: any[], name: string) => {
    setLoadedItems(items)
    setLoadedProgressName(name)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Shipment Quantity Verification</h1>

      <Tabs defaultValue="upload" className="w-full">
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
          <BarcodeScanner initialItems={loadedItems} initialProgressName={loadedProgressName} />
        </TabsContent>

        <TabsContent value="summary" className="p-4 border rounded-md">
          <SummaryReport />
        </TabsContent>

        <TabsContent value="saved" className="p-4 border rounded-md">
          <SavedProgress onLoadProgress={handleLoadProgress} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
