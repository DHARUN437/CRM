import { NextRequest, NextResponse } from "next/server"
import { saveGoogleDriveConnection } from "@/lib/google-drive"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    console.error("Google OAuth error:", error)
    return NextResponse.redirect(new URL("/settings?error=" + encodeURIComponent(error), request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code_provided", request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  // Use current incoming request URL origin + path to ensure exact redirect_uri match with Google OAuth request
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_env_vars", request.url)
    )
  }

  try {
    // Exchange authorization code for access & refresh tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData)
      return NextResponse.redirect(
        new URL("/settings?error=" + encodeURIComponent(tokenData.error_description || "token_exchange_failed"), request.url)
      )
    }

    const refreshToken = tokenData.refresh_token
    if (!refreshToken) {
      console.warn("No refresh_token received in OAuth response. Prompt=consent is required.")
    }

    // Fetch user email from Google UserInfo endpoint
    let userEmail = "Admin"
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        userEmail = userData.email || userEmail
      }
    } catch (e) {
      console.warn("Failed to fetch Google user email:", e)
    }

    // Save refresh token & connection details on server
    await saveGoogleDriveConnection({
      email: userEmail,
      refreshToken: refreshToken || "",
      connectedAt: new Date().toISOString(),
    })

    return NextResponse.redirect(new URL("/settings?success=google_drive_connected", request.url))
  } catch (err: any) {
    console.error("Google Drive OAuth callback handler error:", err)
    return NextResponse.redirect(
      new URL("/settings?error=" + encodeURIComponent(err.message || "oauth_failed"), request.url)
    )
  }
}
