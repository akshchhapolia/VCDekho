const db = require('../../utils/db');

module.exports = async function handler(req, res) {
    // Very basic auth for MVP
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await db.query(`SELECT * FROM articles WHERE status = 'draft' ORDER BY created_at DESC`);
            res.status(200).json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'POST') {
        try {
            const { id, action, title, body, slug, meta_title, meta_description, tags } = req.body;
            
            if (action === 'discard') {
                await db.query(`UPDATE articles SET status = 'discarded', reviewed_at = NOW() WHERE id = $1`, [id]);
                return res.status(200).json({ success: true, status: 'discarded' });
            }

            if (action === 'approve') {
                // Update fields
                await db.query(
                    `UPDATE articles 
                     SET title = $1, body = $2, slug = $3, meta_title = $4, meta_description = $5, tags = $6, status = 'published', reviewed_at = NOW(), published_at = NOW()
                     WHERE id = $7`,
                    [title, body, slug, meta_title, meta_description, tags, id]
                );
                return res.status(200).json({ success: true, status: 'published' });
            }

            res.status(400).json({ error: 'Invalid action' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).end('Method Not Allowed');
    }
};
