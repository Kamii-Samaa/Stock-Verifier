"use server"

import * as XLSX from "xlsx"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
import { STORAGE_PATH, SCANS_PATH } from "./constants"

// Current file path for the session - this needs to be persisted
let CURRENT_FILE_PATH: string | null = null

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    if (!existsSync(STORAGE_PATH)) {
      await mkdir(STORAGE_PATH, { recursive: true })
    }
    if (!existsSync(SCANS_PATH)) {
      await mkdir(SCANS_PATH, { recursive: true })
    }
  } catch (error) {
    console.error("Error creating storage directory:", error)
    throw new Error("Failed to create storage directory")
  }
}

export async function uploadFile(file: File): Promise<string> {
  await ensureStorageDir()

  const buffer = Buffer.from(await file.arrayBuffer())
  const filePath = join(STORAGE_PATH, `${uuidv4()}-${file.name}`)

  await writeFile(filePath, buffer)
  CURRENT_FILE_PATH = filePath

  // Save the current file path to a file so it persists across server restarts
  await writeFile(join(STORAGE_PATH, "current-file-path.txt"), filePath)

  return filePath
}

export async function getSheets(): Promise<string[]> {
  // Try to load the current file path if it's not set
  if (!CURRENT_FILE_PATH) {
    try {
      CURRENT_FILE_PATH = await readFile(join(STORAGE_PATH, "current-file-path.txt"), "utf-8")
    } catch (error) {
      throw new Error("No file has been uploaded")
    }
  }

  if (!existsSync(CURRENT_FILE_PATH)) {
    throw new Error("File no longer exists. Please upload again.")
  }

  const buffer = await readFile(CURRENT_FILE_PATH)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  return workbook.SheetNames
}

export async function getSheetPreview(sheetName: string) {
  // Try to load the current file path if it's not set
  if (!CURRENT_FILE_PATH) {
    try {
      CURRENT_FILE_PATH = await readFile(join(STORAGE_PATH, "current-file-path.txt"), "utf-8")
    } catch (error) {
      throw new Error("No file has been uploaded")
    }
  }

  if (!existsSync(CURRENT_FILE_PATH)) {
    throw new Error("File no longer exists. Please upload again.")
  }

  const buffer = await readFile(CURRENT_FILE_PATH)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  // Convert to JSON with header: 1 to get array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  // Get first 10 rows for preview
  const rows = data.slice(0, 10)

  return {
    headers: rows[0] || [],
    rows: rows,
  }
}

type ScannedItem = {
  barcode: string
  quantity: number
}

export async function saveScannedItems(items: ScannedItem[], name = "default"): Promise<void> {
  await ensureStorageDir()

  const filePath = join(SCANS_PATH, `scanned-items-${name}.json`)
  await writeFile(filePath, JSON.stringify(items, null, 2))

  // Also save the list of saved progress
  const savedProgressList = await getSavedProgressList()
  if (!savedProgressList.includes(name)) {
    savedProgressList.push(name)
    await writeFile(join(SCANS_PATH, "saved-progress-list.json"), JSON.stringify(savedProgressList, null, 2))
  }
}

export async function getSavedProgressList(): Promise<string[]> {
  const filePath = join(SCANS_PATH, "saved-progress-list.json")

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

export async function loadSavedProgress(name: string): Promise<ScannedItem[]> {
  const filePath = join(SCANS_PATH, `scanned-items-${name}.json`)

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

export async function loadScannedItems(): Promise<ScannedItem[]> {
  const filePath = join(SCANS_PATH, "scanned-items.json")

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

// Update the generateSummaryReport function to aggregate quantities for duplicate barcodes
export async function generateSummaryReport(scannedItems: any[], fileConfig: any) {
  try {
    // Try to load the current file path if it's not set
    if (!CURRENT_FILE_PATH) {
      try {
        CURRENT_FILE_PATH = await readFile(join(STORAGE_PATH, "current-file-path.txt"), "utf-8")
      } catch (error) {
        throw new Error("No file has been uploaded. Please upload a file first.")
      }
    }

    if (!existsSync(CURRENT_FILE_PATH)) {
      throw new Error("File no longer exists. Please upload again.")
    }

    if (scannedItems.length === 0) {
      throw new Error("No scanned items found. Please scan items first.")
    }

    console.log("Generating summary report with:", {
      fileConfig,
      scannedItemsCount: scannedItems.length,
      filePath: CURRENT_FILE_PATH,
    })

    // Create a map for quick lookup of scanned quantities, summing duplicates
    const scannedMap = new Map<string, number>()
    for (const item of scannedItems) {
      const currentTotal = scannedMap.get(item.barcode) || 0
      scannedMap.set(item.barcode, currentTotal + item.quantity)
    }

    // Load the supplier file data
    const buffer = await readFile(CURRENT_FILE_PATH)
    const workbook = XLSX.read(buffer, { type: "buffer" })

    // Get the config from the store
    const sheetName = fileConfig.sheetName
    const headerRow = fileConfig.headerRow
    const barcodeColumn = fileConfig.barcodeColumn
    const quantityColumn = fileConfig.quantityColumn

    if (!sheetName || headerRow === undefined || !barcodeColumn || !quantityColumn) {
      throw new Error("Invalid file configuration. Please reconfigure the file.")
    }

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in the file. Please reconfigure.`)
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (!data || data.length <= headerRow) {
      throw new Error("The sheet does not contain enough data. Please check your file.")
    }

    // Generate summary report
    const summary = []

    // Get the column indices for barcode and quantity
    const headers = data[headerRow] as string[]
    const barcodeIndex = headers.indexOf(barcodeColumn)
    const quantityIndex = headers.indexOf(quantityColumn)

    if (barcodeIndex === -1 || quantityIndex === -1) {
      throw new Error(
        `Could not find "${barcodeColumn}" or "${quantityColumn}" columns in the sheet. Please reconfigure.`,
      )
    }

    // Process each row after the header
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[]
      if (!row || row.length <= Math.max(barcodeIndex, quantityIndex)) continue

      const barcode = row[barcodeIndex]?.toString()
      const supplierQty = Number.parseInt(row[quantityIndex]?.toString() || "0")

      if (!barcode) continue

      const scannedQty = scannedMap.get(barcode) || 0
      let discrepancy = "No discrepancy"

      if (supplierQty > scannedQty) {
        discrepancy = "Received less"
      } else if (supplierQty < scannedQty) {
        discrepancy = "Received more"
      }

      summary.push({
        barcode,
        supplierQuantity: supplierQty,
        scannedQuantity: scannedQty,
        discrepancy,
      })
    }

    // Also add items that were scanned but not in the supplier file
    for (const [barcode, quantity] of scannedMap.entries()) {
      if (!summary.some((item) => item.barcode === barcode)) {
        summary.push({
          barcode,
          supplierQuantity: 0,
          scannedQuantity: quantity,
          discrepancy: "Not in supplier file",
        })
      }
    }

    console.log("Summary report generated:", summary.length, "items")
    return summary
  } catch (error) {
    console.error("Error in generateSummaryReport:", error)
    throw error // Re-throw to be handled by the caller
  }
}
