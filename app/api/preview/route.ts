import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { readFile } from "fs/promises"

export async function POST(request: NextRequest) {
  try {
    const { filePath, sheetName } = await request.json()

    if (!filePath || !sheetName) {
      return NextResponse.json({ error: "File path and sheet name are required" }, { status: 400 })
    }

    const buffer = await readFile(filePath)
    const workbook = XLSX.read(buffer, { type: "buffer" })

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      return NextResponse.json({ error: `Sheet "${sheetName}" not found` }, { status: 404 })
    }

    // Convert to JSON with header: 1 to get array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    // Get first 10 rows for preview
    const rows = data.slice(0, 10)

    return NextResponse.json({
      headers: rows[0] || [],
      rows: rows,
    })
  } catch (error) {
    console.error("Error generating preview:", error)
    return NextResponse.json({ error: "Failed to generate sheet preview" }, { status: 500 })
  }
}
