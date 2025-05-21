"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useShipmentStore } from "@/lib/store"
import { generateSummaryReport } from "@/lib/file-utils"
import * as XLSX from "xlsx"

type SummaryItem = {
  barcode: string
  supplierQuantity: number
  scannedQuantity: number
  discrepancy: string
}

interface SummaryReportProps {
  autoGenerate?: boolean
}

export function SummaryReport({ autoGenerate = false }: SummaryReportProps) {
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false)
  const generationInProgress = useRef(false)
  const { toast } = useToast()
  const { fileConfig, scannedItems } = useShipmentStore()

  // Define the generate report function as a callback so it can be used in useEffect
  const handleGenerateReport = useCallback(async () => {
    // Prevent multiple simultaneous generations using a ref
    if (generationInProgress.current) {
      console.log("Generation already in progress, skipping")
      return
    }

    // Don't try to generate if we don't have the necessary data
    if (!fileConfig) {
      console.log("Cannot generate report: No file configuration")
      toast({
        title: "Configuration missing",
        description: "Please configure the file first",
        variant: "destructive",
      })
      return
    }

    if (scannedItems.length === 0) {
      console.log("Cannot generate report: No scanned items")
      toast({
        title: "No scanned items",
        description: "Please scan items before generating a report",
        variant: "destructive",
      })
      return
    }

    console.log("Starting summary report generation...")
    setIsGenerating(true)
    setHasAttemptedGeneration(true)
    generationInProgress.current = true

    try {
      // Generate report using the scanned items from the store
      const report = await generateSummaryReport(scannedItems, fileConfig)
      console.log("Report generated successfully:", report.length, "items")
      setSummaryData(report)
      toast({
        title: "Report generated",
        description: "Summary report has been generated successfully",
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error generating report",
        description:
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "There was an error generating the summary report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      generationInProgress.current = false
    }
  }, [fileConfig, scannedItems, toast])

  // Auto-generate report when component mounts or when autoGenerate prop changes
  useEffect(() => {
    console.log("SummaryReport useEffect triggered", {
      autoGenerate,
      hasData: fileConfig && scannedItems.length > 0,
      hasAttemptedGeneration,
      summaryDataLength: summaryData.length,
      isGenerating,
      generationInProgress: generationInProgress.current,
    })

    if (fileConfig && scannedItems.length > 0) {
      if ((autoGenerate || !hasAttemptedGeneration) && !generationInProgress.current) {
        console.log("Auto-generating report...")
        handleGenerateReport()
      }
    }
  }, [
    fileConfig,
    scannedItems,
    autoGenerate,
    hasAttemptedGeneration,
    handleGenerateReport,
    summaryData.length,
    isGenerating,
  ])

  const handleExportExcel = () => {
    if (summaryData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please generate a report first",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Summary Report</CardTitle>
          <CardDescription>Compare scanned quantities with supplier shipment data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || !fileConfig || scannedItems.length === 0 || generationInProgress.current}
              className="w-full sm:w-auto"
            >
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>

            {summaryData.length > 0 && (
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="w-full sm:w-auto sm:ml-2"
                disabled={isExporting}
              >
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
            )}

            {!fileConfig && <p className="text-amber-600 text-sm">Please configure a shipment file first</p>}
            {fileConfig && scannedItems.length === 0 && (
              <p className="text-amber-600 text-sm">Please scan items first</p>
            )}
          </div>

          {/* Overall summary cards - MOVED TO TOP */}
          {totals && (
            <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {summaryData.length > 0 ? (
            <div className="overflow-x-auto mt-4">
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
                          <span className={item.discrepancy === "No discrepancy" ? "text-green-600" : "text-red-600"}>
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
