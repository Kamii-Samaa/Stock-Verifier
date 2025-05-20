"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useShipmentStore } from "@/lib/store"
import { saveScannedItems } from "@/lib/file-utils"

type ScannedItem = {
  barcode: string
  quantity: number
}

export function BarcodeScanner() {
  const [barcode, setBarcode] = useState("")
  const [quantity, setQuantity] = useState("")
  const [showQuantityInput, setShowQuantityInput] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { fileConfig, scannedItems, setScannedItems, addScannedItem, progressName, setProgressName, setActiveTab } =
    useShipmentStore()

  const [showNamePrompt, setShowNamePrompt] = useState(false)

  useEffect(() => {
    // Focus barcode input on mount
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    // Focus quantity input when it becomes visible
    if (showQuantityInput && quantityInputRef.current) {
      quantityInputRef.current.focus()
    }
  }, [showQuantityInput])

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim()) {
      toast({
        title: "Empty barcode",
        description: "Please scan or enter a barcode",
        variant: "destructive",
      })
      return
    }

    setShowQuantityInput(true)
  }

  // Update the handleQuantitySubmit function to handle duplicate barcodes by summing quantities
  const handleQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number.parseInt(quantity)

    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      })
      return
    }

    // Check if this barcode already exists in scanned items
    const existingItemIndex = scannedItems.findIndex((item) => item.barcode === barcode)

    if (existingItemIndex >= 0) {
      // If barcode exists, update the state with the new total quantity
      const updatedItems = [...scannedItems]
      // Create a new entry for the same barcode instead of updating the quantity
      // This allows tracking individual scans while still summing them in the summary
      updatedItems.push({ barcode, quantity: qty })
      setScannedItems(updatedItems)

      toast({
        title: "Item scanned again",
        description: `Barcode: ${barcode}, Additional Quantity: ${qty}`,
      })
    } else {
      // Add as new item if barcode doesn't exist yet
      const newItem = { barcode, quantity: qty }
      addScannedItem(newItem)

      toast({
        title: "Item scanned",
        description: `Barcode: ${barcode}, Quantity: ${qty}`,
      })
    }

    // Reset for next scan
    setBarcode("")
    setQuantity("")
    setShowQuantityInput(false)

    // Focus back on barcode input
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }

  const handleSaveProgressWithName = () => {
    if (scannedItems.length === 0) {
      toast({
        title: "No items scanned",
        description: "Please scan items before saving progress",
        variant: "destructive",
      })
      return
    }

    // Check if we already have a saved name
    if (progressName) {
      // Just update the existing progress
      handleSaveProgress(progressName)
    } else {
      // Show prompt for name
      setShowNamePrompt(true)
    }
  }

  const handleSaveProgress = async (name: string) => {
    try {
      await saveScannedItems(scannedItems, name)
      setProgressName(name)
      setShowNamePrompt(false)
      toast({
        title: "Progress saved",
        description: `Your scanning progress has been saved as "${name}"`,
      })
    } catch (error) {
      toast({
        title: "Error saving progress",
        description: "There was an error saving your progress",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async () => {
    if (scannedItems.length === 0) {
      toast({
        title: "No items scanned",
        description: "Please scan items before submitting",
        variant: "destructive",
      })
      return
    }

    try {
      // Save the scanned items to ensure they're available for the summary
      if (progressName) {
        await saveScannedItems(scannedItems, progressName)
      } else {
        await saveScannedItems(scannedItems, "latest")
      }

      // Navigate to summary page
      setActiveTab("summary")

      toast({
        title: "Scan completed",
        description: "Your scanned items have been submitted for summary report",
      })
    } catch (error) {
      toast({
        title: "Error submitting items",
        description: "There was an error submitting your scanned items",
        variant: "destructive",
      })
    }
  }

  if (!fileConfig) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium">File Configuration Required</h3>
        <p className="text-gray-500 mt-2">Please upload and configure a shipment file first.</p>
      </div>
    )
  }

  // Add a function to calculate totals for the scanned items table
  const calculateTotals = () => {
    const totals = new Map<string, number>()

    scannedItems.forEach((item) => {
      const currentTotal = totals.get(item.barcode) || 0
      totals.set(item.barcode, currentTotal + item.quantity)
    })

    return totals
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan Items</CardTitle>
          <CardDescription>Scan barcodes and enter quantities to verify against the shipment file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button onClick={() => handleSaveProgressWithName()} className="w-1/2">
              Save Progress
            </Button>
            <Button onClick={() => handleSubmit()} className="w-1/2">
              Submit
            </Button>
          </div>

          {!showQuantityInput ? (
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="barcode" className="text-sm font-medium">
                  Scan or Enter Barcode
                </label>
                <Input
                  id="barcode"
                  ref={barcodeInputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode..."
                  className="text-lg"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full">
                Next
              </Button>
            </form>
          ) : (
            <form onSubmit={handleQuantitySubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Enter Quantity for Barcode: {barcode}
                </label>
                <Input
                  id="quantity"
                  ref={quantityInputRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity..."
                  min="1"
                  className="text-lg"
                  autoComplete="off"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/2"
                  onClick={() => {
                    setShowQuantityInput(false)
                    if (barcodeInputRef.current) {
                      barcodeInputRef.current.focus()
                    }
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="w-1/2">
                  Submit
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scanned Items</CardTitle>
          <CardDescription>{scannedItems.length} items scanned</CardDescription>
        </CardHeader>
        <CardContent>
          {scannedItems.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">#</th>
                      <th className="text-left py-2 px-4">Barcode</th>
                      <th className="text-left py-2 px-4">Quantity</th>
                      <th className="text-left py-2 px-4">Running Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totals = calculateTotals()
                      const runningTotals = new Map<string, number>()

                      return scannedItems.map((item, index) => {
                        // Calculate running total for this barcode up to this point
                        const currentTotal = runningTotals.get(item.barcode) || 0
                        const newTotal = currentTotal + item.quantity
                        runningTotals.set(item.barcode, newTotal)

                        // Highlight rows with duplicate barcodes
                        const isDuplicate = scannedItems.findIndex((i) => i.barcode === item.barcode) < index

                        return (
                          <tr key={index} className={`border-b ${isDuplicate ? "bg-blue-50" : ""}`}>
                            <td className="py-2 px-4">{index + 1}</td>
                            <td className="py-2 px-4">{item.barcode}</td>
                            <td className="py-2 px-4">{item.quantity}</td>
                            <td className="py-2 px-4 font-medium">{newTotal}</td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No items scanned yet</p>
          )}
        </CardContent>
      </Card>
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Save Progress</h3>
            <p className="mb-4">Enter a name to identify this scanning session:</p>
            <Input
              value={progressName}
              onChange={(e) => setProgressName(e.target.value)}
              placeholder="e.g., Shipment May 20"
              className="mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNamePrompt(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveProgress(progressName)} disabled={!progressName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
