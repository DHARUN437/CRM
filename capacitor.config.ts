import type { CapacitorConfig } from "@capacitor/cli"

// Support live server URL injection via env variable CAPACITOR_SERVER_URL, default to live production domain
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://crm.speardigital.in"

const config: CapacitorConfig = {
  appId: "com.joycorporate.crm",
  appName: "JoyCRM",
  webDir: "out",
  server: {
    url: serverUrl,
    androidScheme: "https",
  },
}

export default config
