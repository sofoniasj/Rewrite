/**
 * Sitemap Controller
 * Handles the logic for dynamically generating and serving the sitemap.xml file.
 */

const BASE_URL = 'https://www.yourdomain.com';

// Mock function to simulate fetching a list of dynamic content (e.g., blog posts)
const fetchDynamicUrls = async () => {
    // In a real application, you would query your database (e.g., MongoDB, PostgreSQL)
    // to get IDs, slugs, and last updated timestamps for all your publishable content.
    // Example: const posts = await Post.find({ status: 'published' }).select('slug updatedAt');

    const mockData = [
        { slug: 'introduction-to-seo', lastModified: '2025-11-20' },
        { slug: 'api-design-patterns', lastModified: '2025-12-01' },
        { slug: 'managing-project-state', lastModified: '2025-12-02' },
    ];
    return mockData;
};

/**
 * Generates the XML string for a single URL entry.
 * @param {string} loc The absolute URL.
 * @param {string} lastmod Date of last modification (YYYY-MM-DD).
 * @param {string} changefreq How frequently the content changes (e.g., 'weekly', 'monthly').
 * @param {number} priority Priority (0.0 to 1.0).
 * @returns {string} The formatted <url> XML block.
 */
const generateUrlEntry = (loc, lastmod, changefreq, priority) => {
    return `
    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority.toFixed(1)}</priority>
    </url>`;
};

/**
 * Main controller function to generate and serve the sitemap.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const generateSitemap = async (req, res) => {
    try {
        const dynamicContent = await fetchDynamicUrls();

        // 1. Define Static/Core URLs
        let xmlEntries = '';

        // Home Page
        xmlEntries += generateUrlEntry(`${BASE_URL}/`, '2025-12-02', 'daily', 1.0);

        // About Page
        xmlEntries += generateUrlEntry(`${BASE_URL}/about`, '2025-11-15', 'monthly', 0.8);

        // Services Page
        xmlEntries += generateUrlEntry(`${BASE_URL}/services`, '2025-12-01', 'weekly', 0.8);

        // Contact Page
        xmlEntries += generateUrlEntry(`${BASE_URL}/contact`, '2025-10-01', 'yearly', 0.7);

        // 2. Define Dynamic URLs (e.g., Blog Posts, Product Pages)
        dynamicContent.forEach(item => {
            // Note: The priority and changefreq for detail pages are typically lower.
            xmlEntries += generateUrlEntry(
                `${BASE_URL}/blog/${item.slug}`,
                item.lastModified,
                'monthly',
                0.6
            );
        });

        // 3. Construct the full XML content
        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${xmlEntries}
</urlset>`;

        // 4. Set the correct header and send the response
        res.header('Content-Type', 'application/xml');
        res.send(sitemapXml);

    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Fallback to a plain text error message or serve a simple static error XML
        res.status(500).send('<error>Could not generate sitemap.</error>');
    }
};

// Example of how you would export and use this in your routes file (e.g., router.js):
// import { generateSitemap } from './sitemap.controller.js';
// router.get('/sitemap.xml', generateSitemap);