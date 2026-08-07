import { createClient } from "@/lib/supabase/server"

export interface GoogleDriveConnection {
  email: string
  refreshToken: string
  connectedAt: string
}

export interface GoogleDriveStatus {
  isConnected: boolean
  email?: string
  connectedAt?: string
  folderIdConfigured: boolean
}

/**
 * Gets the current Google Drive connection status for the application exclusively from system_settings table.
 * Note: Refresh token is strictly kept server-side and never returned in status.
 */
export async function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const folderIdConfigured = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID)

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "google_drive_connection")
      .maybeSingle()

    if (error) {
      console.error("Error fetching google_drive_connection from system_settings:", error)
    }

    if (data?.value && data.value.refreshToken) {
      return {
        isConnected: true,
        email: data.value.email || "Admin",
        connectedAt: data.value.connectedAt,
        folderIdConfigured,
      }
    }
  } catch (err: any) {
    console.error("Failed to query system_settings status:", err)
  }

  return {
    isConnected: false,
    folderIdConfigured,
  }
}

/**
 * Stores the Google Drive refresh token & metadata exclusively in Supabase system_settings table.
 */
export async function saveGoogleDriveConnection(connection: GoogleDriveConnection): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: "google_drive_connection",
      value: connection,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )

  if (error) {
    console.error("Failed to save google_drive_connection in system_settings:", error)
    throw new Error(`Database save failed: ${error.message}`)
  }
}

/**
 * Clears the stored Google Drive connection record from system_settings table.
 */
export async function deleteGoogleDriveConnection(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("system_settings").delete().eq("key", "google_drive_connection")
  if (error) {
    console.error("Failed to delete google_drive_connection from system_settings:", error)
    throw new Error(`Database delete failed: ${error.message}`)
  }
}

/**
 * Server-only helper: Reads stored refresh token exclusively from system_settings table.
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "google_drive_connection")
      .maybeSingle()

    return data?.value?.refreshToken || null
  } catch {
    return null
  }
}

/**
 * Exchanges stored refresh token for a fresh short-lived Google Access Token.
 */
export async function getFreshAccessToken(): Promise<string> {
  const refreshToken = await getStoredRefreshToken()
  if (!refreshToken) {
    throw new Error("No Google Drive refresh token found in database. Please connect Google Drive first.")
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable is missing.")
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.access_token) {
    console.error("Google token refresh failed:", data)
    throw new Error(data.error_description || "Failed to refresh Google access token.")
  }

  return data.access_token as string
}

/**
 * Helper to find or create a folder in Google Drive.
 */
export async function getOrCreateFolder({
  folderName,
  parentFolderId,
}: {
  folderName: string
  parentFolderId?: string
}): Promise<string> {
  const accessToken = await getFreshAccessToken()
  const parent = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID

  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`
  if (parent) {
    query += ` and '${parent}' in parents`
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  const searchData = await searchRes.json()
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  }
  if (parent) {
    metadata.parents = [parent]
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  })

  const createData = await createRes.json()
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message || "Failed to create folder in Google Drive.")
  }

  return createData.id
}

/**
 * Uploads a file to Google Drive folder using Multipart Upload API.
 */
export async function uploadFileToDrive({
  fileName,
  mimeType,
  fileContent,
  folderId,
}: {
  fileName: string
  mimeType: string
  fileContent: string | Buffer
  folderId?: string
}): Promise<{ id: string; name: string; webViewLink?: string }> {
  const accessToken = await getFreshAccessToken()
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType,
  }

  if (targetFolder) {
    metadata.parents = [targetFolder]
  }

  const boundary = "-------314159265358979323846"
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  let bodyBuffer: Buffer
  if (Buffer.isBuffer(fileContent)) {
    const header =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n`
    const footer = closeDelimiter

    bodyBuffer = Buffer.concat([
      Buffer.from(header, "utf-8"),
      fileContent,
      Buffer.from(footer, "utf-8"),
    ])
  } else {
    const bodyStr =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      fileContent +
      closeDelimiter
    bodyBuffer = Buffer.from(bodyStr, "utf-8")
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBuffer,
    }
  )

  const data = await res.json()

  if (!res.ok) {
    console.error("Google Drive upload error:", data)
    throw new Error(data.error?.message || "Failed to upload file to Google Drive.")
  }

  return data
}
