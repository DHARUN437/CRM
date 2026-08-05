/**
 * CSV export utility for JoyCRM
 */

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const csvLines: string[] = []

  // Header row
  csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","))

  // Data rows
  for (const row of rows) {
    const line = headers.map((header) => {
      const val = row[header]
      if (val === null || val === undefined) return '""'
      if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      return `"${String(val).replace(/"/g, '""')}"`
    })
    csvLines.push(line.join(","))
  }

  const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n")
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
