import { NextRequest, NextResponse } from "next/server"
import { saveGoogleDriveConnection } from "@/lib/google-drive"

const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state")
  const savedState = request.cookies.get(STATE_COOKIE)?.value

  const redirectWithError = (message: string) => {
    const res = NextResponse.redirect(
      new URL("/settings?error=" + encodeURIComponent(message), request.url)
    )
    res.cookies.delete(STATE_COOKIE)
    return res
  }

  if (error) {
    console.error("Google OAuth error:", error)
    return redirectWithError(error)
  }

  if (!code) {
    return redirectWithError("no_code_provided")
  }

  if (!state || !savedState || state.length !== savedState.length || !timingSafeEqual(state, savedState)) {
    console.error("OAuth state mismatch: CSRF protection triggered.")
    return redirectWithError("oauth_state_mismatch")
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithError("missing_env_vars")
  }

  try {
    // Exchange authorization code for tokens
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
      return redirectWithError(tokenData.error_description || "token_exchange_failed")
    }

    const refreshToken = tokenData.refresh_token
    if (!refreshToken) {
      console.warn("No refresh_token received in OAuth response. Prompt=consent is required.")
    }

    // Fetch user email
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

    const successRes = NextResponse.redirect(
      new URL("/settings?success=google_drive_connected", request.url)
    )
    successRes.cookies.delete(STATE_COOKIE)
    return successRes
  } catch (err) {
    console.error("Google Drive OAuth callback handler error:", err)
    return redirectWithError(err instanceof Error ? err.message : "oauth_failed")
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  const aBytes = Buffer.from(a, "utf8")
  const bBytes = Buffer.from(b, "utf8")
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }
  return result === 0
}
