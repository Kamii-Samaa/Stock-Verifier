"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useShipmentStore } from "@/lib/store"
import { generateSummaryReport } from "@/lib/file-utils"
import * as XLSX from "xlsx"

interface TrialExpiredSummaryProps {
  onUpgrade: () => void
}

export function TrialExpiredSummary({ onUpgrade }: TrialExpiredSummaryProps) {
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const { fileConfig, scannedItems } = useShipmentStore()

  // Generate report on component mount
  useEffect(() => {
    generateSummary()
  }, [])

  const generateSummary = async () => {
    if (!fileConfig || scannedItems.length === 0) {
      return
    }

    setIsGenerating(true)
    try {
      const report = await generateSummaryReport(scannedItems, fileConfig)
      setSummaryData(report)
    } catch (error) {
      console.error("Error generating summary:", error)
      toast({
        title: "Error generating summary",
        description: "There was a problem generating your summary report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportExcel = () => {
    if (summaryData.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no summary data to export",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new()

      // Prepare data for export
      const exportData = summaryData.map((item) => {
        const scanCount = scannedItems.filter((scan) => scan.barcode === item.barcode).length
        const difference = item.scannedQuantity - item.supplierQuantity

        return {
          // Format barcode as text by adding a single quote prefix
          Barcode: `'${item.barcode}`,
          "Sent Qty": item.supplierQuantity,
          "Scanned Qty": item.scannedQuantity,
          Difference: difference,
          "Scan Count": scanCount,
          Discrepancy: item.discrepancy,
        }
      })

      // Add totals row
      const totals = calculateTotals()
      if (totals) {
        exportData.push({
          Barcode: "TOTALS",
          "Sent Qty": totals.totalSent,
          "Scanned Qty": totals.totalScanned,
          Difference: totals.difference,
          "Scan Count": "",
          Discrepancy: "",
        })
      }

      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Barcode
        { wch: 10 }, // Sent Qty
        { wch: 10 }, // Scanned Qty
        { wch: 10 }, // Difference
        { wch: 10 }, // Scan Count
        { wch: 15 }, // Discrepancy
      ]
      ws["!cols"] = colWidths

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Summary Report")

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })

      // Create a Blob from the buffer
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const date = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      link.setAttribute("href", url)
      link.setAttribute("download", `shipment_summary_${date}.xlsx`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: "Summary report has been exported to Excel",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: "There was an error exporting the report",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate totals for the summary
  const calculateTotals = () => {
    if (summaryData.length === 0) return null

    const totalSent = summaryData.reduce((sum, item) => sum + item.supplierQuantity, 0)
    const totalScanned = summaryData.reduce((sum, item) => sum + item.scannedQuantity, 0)
    const difference = totalScanned - totalSent

    return {
      totalSent,
      totalScanned,
      difference,
    }
  }

  const totals = calculateTotals()

  if (!fileConfig || scannedItems.length === 0) {
    return (
      <div className="p-8 border rounded-lg bg-gray-50 text-center">
        <h2 className="text-2xl font-bold mb-4">Thank you for using the trial version</h2>
        <p className="text-lg mb-6">
          No data available for summary. Purchase a license to go pro and continue using all features.
        </p>
        <Button onClick={onUpgrade} size="lg">
          Upgrade to Pro
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="p-8 border rounded-lg bg-gray-50 text-center">
        <h2 className="text-2xl font-bold mb-4">Thank you for using the trial version</h2>
        <p className="text-lg mb-6">Purchase a license to go pro and continue using all features.</p>
        <div className="flex justify-center gap-4">
          <Button onClick={onUpgrade} size="lg">
            Upgrade to Pro
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="lg" disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {isGenerating ? (
        <div className="text-center py-8">
          <p className="text-lg">Generating summary report...</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {totals && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totals.totalSent}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Scanned</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totals.totalScanned}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Difference</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-3xl font-bold ${
                      totals.difference === 0
                        ? "text-green-600"
                        : totals.difference > 0
                          ? "text-blue-600"
                          : "text-red-600"
                    }`}
                  >
                    {totals.difference > 0 ? "+" : ""}
                    {totals.difference}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary table */}
          {summaryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Report</CardTitle>
                <CardDescription>Compare scanned quantities with supplier shipment data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Sent Qty</TableHead>
                        <TableHead>Scanned Qty</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Scan Count</TableHead>
                        <TableHead>Discrepancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((item, index) => {
                        // Count how many times this barcode was scanned
                        const scanCount = scannedItems.filter((scan) => scan.barcode === item.barcode).length
                        // Calculate difference
                        const difference = item.scannedQuantity - item.supplierQuantity

                        return (
                          <TableRow key={index}>
                            <TableCell>{item.barcode}</TableCell>
                            <TableCell>{item.supplierQuantity}</TableCell>
                            <TableCell className="font-medium">{item.scannedQuantity}</TableCell>
                            <TableCell
                              className={
                                difference === 0 ? "text-green-600" : difference > 0 ? "text-blue-600" : "text-red-600"
                              }
                            >
                              {difference > 0 ? "+" : ""}
                              {difference}
                            </TableCell>
                            <TableCell>{scanCount}</TableCell>
                            <TableCell>
                              <span
                                className={item.discrepancy === "No discrepancy" ? "text-green-600" : "text-red-600"}
                              >
                                {item.discrepancy}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {/* Totals row */}
                      {totals && (
                        <TableRow className="bg-gray-100 font-bold">
                          <TableCell>TOTALS</TableCell>
                          <TableCell>{totals.totalSent}</TableCell>
                          <TableCell>{totals.totalScanned}</TableCell>
                          <TableCell
                            className={
                              totals.difference === 0
                                ? "text-green-600"
                                : totals.difference > 0
                                  ? "text-blue-600"
                                  : "text-red-600"
                            }
                          >
                            {totals.difference > 0 ? "+" : ""}
                            {totals.difference}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
