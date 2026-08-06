import type { CapacitorConfig } from "@capacitor/cli"

// Support live server URL injection via env variable CAPACITOR_SERVER_URL, fallback to local IP or hosted URL
const serverUrl = process.env.CAPACITOR_SERVER_URL || "http://192.168.1.41:3000"

const config: CapacitorConfig = {
  appId: "com.joycorporate.crm",
  appName: "JoyCRM",
  webDir: "out",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: true,
  },
}

export default config
