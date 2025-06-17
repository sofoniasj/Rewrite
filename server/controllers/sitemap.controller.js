import asyncHandler from 'express-async-handler';
import Content from '../models/content.model.js'; // adjust if named differently
import { format } from 'date-fns'; // optional, for formatting <lastmod>

export const generateSitemap = asyncHandler(async (req, res) => {
  const baseUrl = 'https://rewrite-9ers.onrender.com';

  // Fetch only top-level, public articles (adjust filters as needed)
  const publicArticles = await Content.find({
    isPrivate: false,            // adjust to your actual field
    parentContent: null,         // only top-level articles
  }).select('_id updatedAt');

  // Start building XML
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Homepage
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}/</loc>\n`;
  sitemap += `    <changefreq>daily</changefreq>\n`;
  sitemap += `    <priority>1.0</priority>\n`;
  sitemap += `  </url>\n`;

  // Public articles
  publicArticles.forEach((article) => {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${baseUrl}/article/${article._id}</loc>\n`;
    sitemap += `    <lastmod>${format(new Date(article.updatedAt), 'yyyy-MM-dd')}</lastmod>\n`;
    sitemap += `    <changefreq>weekly</changefreq>\n`;
    sitemap += `    <priority>0.8</priority>\n`;
    sitemap += `  </url>\n`;
  });

  sitemap += `</urlset>`;

  // Set response headers
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});
