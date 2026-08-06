import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.joycorporate.crm",
  appName: "JoyCRM",
  webDir: "out",
  server: {
    androidScheme: "https",
    // To enable live reload during development on mobile emulator / device:
    // url: "http://192.168.1.X:3000",
    // cleartext: true
  },
}

export default config
