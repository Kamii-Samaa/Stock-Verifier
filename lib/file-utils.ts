"use server"

import * as XLSX from "xlsx"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
import { STORAGE_PATH, SCANS_PATH } from "./constants"

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

// Saves the uploaded file to a unique, sanitized filename (uuid.ext) in the STORAGE_PATH.
// Returns the generated filename, which serves as the fileId for subsequent operations.
export async function uploadFile(file: File, fileBuffer: Buffer, detectedExt: string): Promise<string> {
  await ensureStorageDir()

  // Use detected extension, fallback to original if necessary, ensure it starts with a dot
  const fileExtension = detectedExt ? `.${detectedExt}` : extname(file.name);
  const fileName = `${uuidv4()}${fileExtension}`;
  const filePath = join(STORAGE_PATH, fileName);

  await writeFile(filePath, fileBuffer);
  // No longer uses CURRENT_FILE_PATH or writes to current-file-path.txt

  return fileName; // This is the fileId
}

// Retrieves sheet names from the Excel file identified by fileId.
// fileId is the unique filename (e.g., uuid.xlsx) generated upon file upload.
export async function getSheets(fileId: string): Promise<string[]> {
  if (!fileId) {
    throw new Error("File identifier is required");
  }
  const filePath = join(STORAGE_PATH, fileId);

  if (!existsSync(filePath)) {
    throw new Error(`File not found for identifier: ${fileId}`);
  }

  const buffer = await readFile(filePath)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  return workbook.SheetNames
}

// Generates a preview of the specified sheet from the file identified by fileId.
// fileId is the unique filename (e.g., uuid.xlsx) generated upon file upload.
export async function getSheetPreview(fileId: string, sheetName: string) {
  if (!fileId) {
    throw new Error("File identifier is required");
  }
  const filePath = join(STORAGE_PATH, fileId);

  if (!existsSync(filePath)) {
    throw new Error(`File not found for identifier: ${fileId}`);
  }

  const buffer = await readFile(filePath)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in file: ${fileId}`);
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

  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = join(SCANS_PATH, `scanned-items-${sanitizedName}.json`);
  await writeFile(filePath, JSON.stringify(items, null, 2))

  // Also save the list of saved progress
  const savedProgressList = await getSavedProgressList()
  if (!savedProgressList.includes(sanitizedName)) {
    savedProgressList.push(sanitizedName)
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
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = join(SCANS_PATH, `scanned-items-${sanitizedName}.json`);

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
interface FileConfig {
  sheetName: string;
  headerRow: number;
  barcodeColumn: string;
  quantityColumn: string;
}

export async function generateSummaryReport(scannedItems: ScannedItem[], fileConfig: FileConfig, fileId: string) {
  if (!fileId) {
    throw new Error("File identifier is required for the report");
  }
  const filePath = join(STORAGE_PATH, fileId);

  try {
    if (!existsSync(filePath)) {
      throw new Error(`File not found for identifier: ${fileId}`);
    }

    if (scannedItems.length === 0) {
      throw new Error("No scanned items found. Please scan items first.")
    }

    console.log("Generating summary report with:", {
      fileConfig,
      scannedItemsCount: scannedItems.length,
      filePath: filePath,
    })

    // Create a map for quick lookup of scanned quantities, summing duplicates
    const scannedMap = new Map<string, number>()
    for (const item of scannedItems) {
      const currentTotal = scannedMap.get(item.barcode) || 0
      scannedMap.set(item.barcode, currentTotal + item.quantity)
    }

    // Load the supplier file data
    const buffer = await readFile(filePath)
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
      throw new Error(`Sheet "${sheetName}" not found in file: ${fileId}. Please reconfigure.`);
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (!data || data.length <= headerRow) {
      throw new Error(`The sheet "${sheetName}" does not contain enough data or is invalid. Please check your file: ${fileId}`);
    }

    // Generate summary report
    const summary = []

    // Get the column indices for barcode and quantity
    const headers = data[headerRow] as string[]
    const barcodeIndex = headers.indexOf(barcodeColumn)
    const quantityIndex = headers.indexOf(quantityColumn)

    if (barcodeIndex === -1 || quantityIndex === -1) {
      throw new Error(
        `Could not find "${barcodeColumn}" or "${quantityColumn}" columns in sheet "${sheetName}". Please reconfigure. File: ${fileId}`
      );
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
