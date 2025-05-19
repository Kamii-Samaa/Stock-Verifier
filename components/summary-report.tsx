"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useShipmentStore } from "@/lib/store"
import { generateSummaryReport } from "@/lib/file-utils"

type SummaryItem = {
  barcode: string
  supplierQuantity: number
  scannedQuantity: number
  discrepancy: string
}

export function SummaryReport() {
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { fileConfig } = useShipmentStore()

  const handleGenerateReport = async () => {
    if (!fileConfig) {
      toast({
        title: "Configuration missing",
        description: "Please configure the file first",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const report = await generateSummaryReport()
      setSummaryData(report)
      toast({
        title: "Report generated",
        description: "Summary report has been generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error generating report",
        description: "There was an error generating the summary report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportCSV = () => {
    if (summaryData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please generate a report first",
        variant: "destructive",
      })
      return
    }

    // Create CSV content
    const headers = ["Barcode", "Supplier Quantity", "Scanned Quantity", "Discrepancy"]
    const csvContent = [
      headers.join(","),
      ...summaryData.map((item) =>
        [item.barcode, item.supplierQuantity, item.scannedQuantity, item.discrepancy].join(","),
      ),
    ].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "shipment_summary.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Summary Report</CardTitle>
          <CardDescription>Compare scanned quantities with supplier shipment data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleGenerateReport} disabled={isGenerating || !fileConfig} className="w-full sm:w-auto">
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>

            {summaryData.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto sm:ml-2">
                Export to CSV
              </Button>
            )}

            {!fileConfig && <p className="text-amber-600 text-sm">Please configure a shipment file first</p>}
          </div>

          {summaryData.length > 0 ? (
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Sent Qty</TableHead>
                    <TableHead>Scanned Qty</TableHead>
                    <TableHead>Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.barcode}</TableCell>
                      <TableCell>{item.supplierQuantity}</TableCell>
                      <TableCell>{item.scannedQuantity}</TableCell>
                      <TableCell>
                        <span className={item.discrepancy === "No discrepancy" ? "text-green-600" : "text-red-600"}>
                          {item.discrepancy}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {isGenerating
                ? "Generating report..."
                : "No report data available. Click 'Generate Report' to create a summary."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
