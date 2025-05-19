import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { readFile } from "fs/promises"

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: "No file path provided" }, { status: 400 })
    }

    const buffer = await readFile(filePath)
    const workbook = XLSX.read(buffer, { type: "buffer" })

    return NextResponse.json({ sheets: workbook.SheetNames })
  } catch (error) {
    console.error("Error reading sheets:", error)
    return NextResponse.json({ error: "Failed to read sheets from file" }, { status: 500 })
  }
}
