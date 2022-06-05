const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    console.log('data of a home page for visitors');
    try {        
        const chapters = await pool.query(`
            SELECT
                id,
                no,
                title
            FROM course_chapter
            ORDER BY no;
        `);
        res.json({ chapters: chapters.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.get('/chapter/:chapterId', async (req, res) => {
    try {
        const chapter = await pool.query(`
            SELECT
                title AS "title",
                description AS "description",
                image_path AS "image"
            FROM course_chapter
            WHERE id = $1;
        `, [req.params.chapterId]);
        if (chapter.rows.length !== 0){
            res.json({ chapter: chapter.rows[0] });
        } else {
            res.status(404).json('Chapter Not Found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});  

module.exports = router;