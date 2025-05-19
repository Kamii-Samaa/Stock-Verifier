"use server"

import * as XLSX from "xlsx"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"

// Temporary storage path for uploaded files and data
const STORAGE_PATH = "/tmp/shipment-verification"
let CURRENT_FILE_PATH: string | null = null

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    if (!existsSync(STORAGE_PATH)) {
      await mkdir(STORAGE_PATH, { recursive: true })
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

  return filePath
}

export async function getSheets(): Promise<string[]> {
  if (!CURRENT_FILE_PATH) {
    throw new Error("No file has been uploaded")
  }

  const buffer = await readFile(CURRENT_FILE_PATH)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  return workbook.SheetNames
}

export async function getSheetPreview(sheetName: string) {
  if (!CURRENT_FILE_PATH) {
    throw new Error("No file has been uploaded")
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

  const filePath = join(STORAGE_PATH, `scanned-items-${name}.json`)
  await writeFile(filePath, JSON.stringify(items))

  // Also save the list of saved progress
  const savedProgressList = await getSavedProgressList()
  if (!savedProgressList.includes(name)) {
    savedProgressList.push(name)
    await writeFile(join(STORAGE_PATH, "saved-progress-list.json"), JSON.stringify(savedProgressList))
  }
}

export async function getSavedProgressList(): Promise<string[]> {
  const filePath = join(STORAGE_PATH, "saved-progress-list.json")

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

export async function loadSavedProgress(name: string): Promise<ScannedItem[]> {
  const filePath = join(STORAGE_PATH, `scanned-items-${name}.json`)

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

export async function loadScannedItems(): Promise<ScannedItem[]> {
  const filePath = join(STORAGE_PATH, "scanned-items.json")

  try {
    const data = await readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array
    return []
  }
}

export async function generateSummaryReport() {
  if (!CURRENT_FILE_PATH) {
    throw new Error("No file has been uploaded")
  }

  // Load scanned items
  const scannedItems = await loadScannedItems()
  if (scannedItems.length === 0) {
    throw new Error("No scanned items found")
  }

  // Create a map for quick lookup of scanned quantities
  const scannedMap = new Map<string, number>()
  for (const item of scannedItems) {
    scannedMap.set(item.barcode, item.quantity)
  }

  // Load the supplier file data
  const buffer = await readFile(CURRENT_FILE_PATH)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  // Get the config from the session (this would be stored in your database or state management)
  // For this example, we'll use hardcoded values
  const sheetName = "Sheet1" // This would come from your config
  const headerRow = 0 // This would come from your config
  const barcodeColumn = "A" // This would come from your config
  const quantityColumn = "B" // This would come from your config

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: "A" })

  // Generate summary report
  const summary = []

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i] as any
    const barcode = row[barcodeColumn]?.toString()
    const supplierQty = Number.parseInt(row[quantityColumn]?.toString() || "0")

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

  return summary
}
