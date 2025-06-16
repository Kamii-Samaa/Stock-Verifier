import { type NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/file-utils";
import { fileTypeFromBuffer } from 'file-type';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // File type validation using magic numbers
    const detectedType = await fileTypeFromBuffer(fileBuffer);
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.ms-excel.sheet.macroEnabled.12" // .xlsm
    ];

    if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
      return NextResponse.json({ error: "Invalid file content. Only Excel files are allowed." }, { status: 400 });
    }

    // The old check can be removed:
    // if (!file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
    //   return NextResponse.json({ error: "Invalid file type. Only Excel files are allowed." }, { status: 400 });
    // }

    // Pass the file object, buffer, and detected extension to the centralized uploadFile function.
    // uploadFile handles saving the file with a unique ID and returns this fileId.
    const fileId = await uploadFile(file, fileBuffer, detectedType.ext);

    // Return the fileId to the client. The client should use this fileId
    // for subsequent API calls related to this file (e.g., getting sheets, preview).
    return NextResponse.json({ fileId });
  } catch (error) {
    console.error("Error uploading file:", error);
    // Check if error is a known type with a message property
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
