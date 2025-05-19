"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { getSheets, getSheetPreview } from "@/lib/file-utils"
import { useToast } from "@/hooks/use-toast"
import { useShipmentStore } from "@/lib/store"

type SheetPreview = {
  headers: string[]
  rows: string[][]
}

export function SheetSelector() {
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>("")
  const [preview, setPreview] = useState<SheetPreview | null>(null)
  const [selectedHeaderRow, setSelectedHeaderRow] = useState<number>(0)
  const [barcodeColumn, setBarcodeColumn] = useState<string>("")
  const [quantityColumn, setQuantityColumn] = useState<string>("")
  const { toast } = useToast()
  const { setFileConfig } = useShipmentStore()

  useEffect(() => {
    const loadSheets = async () => {
      try {
        const sheetNames = await getSheets()
        setSheets(sheetNames)
      } catch (error) {
        toast({
          title: "Error loading sheets",
          description: "Could not load sheets from the file",
          variant: "destructive",
        })
      }
    }

    loadSheets()
  }, [toast])

  const handleSheetChange = async (value: string) => {
    setSelectedSheet(value)
    try {
      const previewData = await getSheetPreview(value)
      setPreview(previewData)
      // Reset selections
      setSelectedHeaderRow(0)
      setBarcodeColumn("")
      setQuantityColumn("")
    } catch (error) {
      toast({
        title: "Error loading preview",
        description: "Could not load sheet preview",
        variant: "destructive",
      })
    }
  }

  const handleHeaderRowSelect = (rowIndex: number) => {
    setSelectedHeaderRow(rowIndex)
  }

  const handleSaveConfig = () => {
    if (!selectedSheet || selectedHeaderRow === -1 || !barcodeColumn || !quantityColumn) {
      toast({
        title: "Incomplete configuration",
        description: "Please select all required fields",
        variant: "destructive",
      })
      return
    }

    setFileConfig({
      sheetName: selectedSheet,
      headerRow: selectedHeaderRow,
      barcodeColumn,
      quantityColumn,
    })

    toast({
      title: "Configuration saved",
      description: "You can now proceed to scanning items",
    })

    // Navigate to scan items page
    const tabsElement = document.querySelector('[value="scan"]') as HTMLElement
    if (tabsElement) {
      tabsElement.click()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Sheet</CardTitle>
          <CardDescription>Choose the sheet containing your shipment data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((sheet) => (
                  <SelectItem key={sheet} value={sheet}>
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sheet Preview</CardTitle>
              <CardDescription>Click on a row to select it as the header row</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableBody>
                    {preview.rows.map((row, rowIndex) => (
                      <TableRow
                        key={rowIndex}
                        className={selectedHeaderRow === rowIndex ? "bg-blue-100" : ""}
                        onClick={() => handleHeaderRowSelect(rowIndex)}
                      >
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedHeaderRow !== -1 && <p className="mt-2 text-sm">Selected header row: {selectedHeaderRow + 1}</p>}
            </CardContent>
          </Card>

          {selectedHeaderRow !== -1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Columns</CardTitle>
                <CardDescription>Identify which columns contain barcode and quantity data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barcode Column</label>
                    <Select value={barcodeColumn} onValueChange={setBarcodeColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select barcode column" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.rows[selectedHeaderRow].map((header, index) => (
                          <SelectItem key={index} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity Column</label>
                    <Select value={quantityColumn} onValueChange={setQuantityColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quantity column" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.rows[selectedHeaderRow].map((header, index) => (
                          <SelectItem key={index} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} className="mt-4" disabled={!barcodeColumn || !quantityColumn}>
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
