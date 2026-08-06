import type { CapacitorConfig } from "@capacitor/cli"

// Support live server URL injection via env variable CAPACITOR_SERVER_URL, default to temporary testing site domain
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://lawngreen-alpaca-627630.hostingersite.com"

const config: CapacitorConfig = {
  appId: "com.joycorporate.crm",
  appName: "JoyCRM",
  webDir: "out",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: false,
  },
}

export default config
