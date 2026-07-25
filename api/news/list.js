const db = require('../../utils/db');

module.exports = async function handler(req, res) {
    if (!process.env.DATABASE_URL) {
        // Mock data when database isn't connected
        return res.status(200).json([
            {
                id: 3,
                title: "Startup & Tech Daily Digest: Jun 18",
                slug: "startup-tech-digest-2026-06-18",
                category: "daily-digest",
                source_name: "VCDekho Original",
                source_url: "/",
                published_at: new Date().toISOString(),
                image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2000&auto=format&fit=crop",
                meta_description: "A comprehensive roundup of today's startup ecosystem news, featuring funding, tech, and milestones."
            },
            {
                id: 2,
                title: "Rusk Media Raises ₹100 Crore Pre-Series C Led by Nazara Technologies",
                slug: "rusk-media-raises-100-crore-pre-series-c-nazara-technologies",
                category: "funding-round",
                source_name: "Inc42",
                source_url: "https://inc42.com/buzz/digital-entertainment-startup-rusk-media-secures-%e2%82%b9100-cr/",
                published_at: new Date(Date.now() - 3600000).toISOString(),
                image_url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop",
                meta_description: "Mumbai-based Rusk Media secures ₹100 crore in Pre-Series C funding led by Nazara Technologies, with InfoEdge Ventures, IvyCap Ventures, and Audacity VC participating to fuel Gen Z digital content expansion."
            },
            {
                id: 1,
                title: "Karo Sambhav Raises ₹56 Crore Pre-Series A Led by Rainmatter",
                slug: "karo-sambhav-raises-56-crore-pre-series-a-rainmatter",
                category: "funding-round",
                source_name: "Inc42",
                source_url: "https://inc42.com/buzz/karo-sambhav-raises-%e2%82%b956-cr-to-turn-e-waste-into-critical-raw-materials/",
                published_at: new Date(Date.now() - 7200000).toISOString(),
                image_url: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=2000&auto=format&fit=crop",
                meta_description: "Delhi NCR cleantech startup Karo Sambhav raises ₹56 crore in Pre-Series A funding led by Rainmatter. The EPR compliance firm works with Apple, Dell, HP and 30+ global brands across e-waste, battery, plastic and glass waste streams."
            }
        ]);
    }

    const { category } = req.query;
    let query = `SELECT id, title, slug, category, published_at, source_name, meta_description, tags FROM articles WHERE status = 'published'`;
    const params = [];

    if (category) {
        query += ` AND category = $1`;
        params.push(category);
    } else {
        // News feed should not mix in evergreen blog posts
        query += ` AND category IS DISTINCT FROM 'blog'`;
    }
    
    query += ` ORDER BY published_at DESC LIMIT 50`;

    try {
        const { rows } = await db.query(query, params);
        
        // Return heavily cached response for performance
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
