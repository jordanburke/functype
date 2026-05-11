// Bundle size analyzer script
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { gzipSync } from "zlib"

// Get directory name using ES modules syntax
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, "../dist")

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

// Analyze bundle sizes
function analyzeBundleSize() {
  console.log("\n=== BUNDLE SIZE ANALYSIS ===\n")

  // Get all .mjs files from the dist directory and subdirectories
  const files = []

  function scanDir(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent) => {
      const fullPath = path.join(directory, dirent.name)
      if (dirent.isDirectory()) {
        scanDir(fullPath)
      } else if (dirent.name.endsWith(".mjs") && !dirent.name.includes(".map")) {
        const relativePath = path.relative(distDir, fullPath)
        files.push({
          path: fullPath,
          name: relativePath,
        })
      }
    })
  }

  scanDir(distDir)

  // Sort files by size
  const fileStats = files
    .map((file) => {
      const content = fs.readFileSync(file.path)
      const gzippedContent = gzipSync(content)

      return {
        name: file.name,
        size: content.length,
        gzippedSize: gzippedContent.length,
      }
    })
    .sort((a, b) => b.size - a.size)

  // Print table
  console.log("Individual Module Sizes:\n")
  console.log("| Module | Raw Size | Gzipped Size |")
  console.log("|--------|----------|--------------|")

  fileStats.forEach((stat) => {
    console.log(
      `| ${stat.name.padEnd(20)} | ${formatBytes(stat.size).padEnd(10)} | ${formatBytes(stat.gzippedSize).padEnd(10)} |`,
    )
  })

  // Print total
  const totalSize = fileStats.reduce((sum, stat) => sum + stat.size, 0)
  const totalGzippedSize = fileStats.reduce((sum, stat) => sum + stat.gzippedSize, 0)

  console.log("\nTotal Size:")
  console.log(`Raw: ${formatBytes(totalSize)}`)
  console.log(`Gzipped: ${formatBytes(totalGzippedSize)}`)

  console.log("\n=== END ANALYSIS ===\n")
}

analyzeBundleSize()
