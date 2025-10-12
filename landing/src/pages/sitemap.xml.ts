export async function GET() {
  const baseUrl = "https://functype.org"
  const pages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/option", priority: "0.8", changefreq: "monthly" },
    { loc: "/either", priority: "0.8", changefreq: "monthly" },
    { loc: "/list", priority: "0.8", changefreq: "monthly" },
    { loc: "/task", priority: "0.8", changefreq: "monthly" },
    { loc: "/do-notation", priority: "0.8", changefreq: "monthly" },
    { loc: "/match", priority: "0.8", changefreq: "monthly" },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
