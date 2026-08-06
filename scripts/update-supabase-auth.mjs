import { readFileSync } from "fs"

const token = process.env.SUPABASE_ACCESS_TOKEN || ""
const projectRef = "xgeskisiwrgizhmabsci"
const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

console.log("Updating Supabase Auth URLs for temporary testing domain...")

const payload = {
  site_url: "https://lawngreen-alpaca-627630.hostingersite.com",
  uri_allow_list: "https://lawngreen-alpaca-627630.hostingersite.com/**,https://crm.speardigital.in/**,http://localhost:3000/**",
}

async function update() {
  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN environment variable required.")
    process.exit(1)
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error("Failed to update Supabase Auth Config:", errText)
    process.exit(1)
  }

  const updated = await res.json()
  console.log("✅ SUPABASE AUTH CONFIG SUCCESSFULLY UPDATED & VERIFIED:")
  console.log("Primary Site URL:", updated.site_url)
  console.log("Redirect URLs List:", updated.uri_allow_list)
}

update()
