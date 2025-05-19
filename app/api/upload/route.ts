import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"

// Temporary storage path
const STORAGE_PATH = "/tmp/shipment-verification"

export async function POST(request: NextRequest) {
  try {
    // Ensure storage directory exists
    if (!existsSync(STORAGE_PATH)) {
      await mkdir(STORAGE_PATH, { recursive: true })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check if file is Excel
    if (!file.name.match(/\.(xlsx|xls|xlsm)$/)) {
      return NextResponse.json({ error: "Invalid file type. Only Excel files are allowed." }, { status: 400 })
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = join(STORAGE_PATH, `${uuidv4()}-${file.name}`)
    await writeFile(filePath, buffer)

    // Store file path in session (in a real app, you'd use a database)
    // For this example, we'll just return the path
    return NextResponse.json({ filePath })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
