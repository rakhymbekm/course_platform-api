const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwtGenerator = require('../utils/jwtGenerator');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

router.get('/', authorize, async (req, res) => {
    try {
        if (req.isAdmin) {
            res.redirect('/chapters');
        }

        const data = await pool.query(`
            SELECT
                (
                    SELECT COUNT(*)
                    FROM course_chapter
                ) AS "allChapterAmount",
                (
                    SELECT COUNT(*)
                    FROM course_chapter_user
                    WHERE user_id = $1 AND completed
                ) AS "completedChapterAmount"
            FROM users AS u
            CROSS JOIN course_chapter AS cch
            JOIN course_chapter_user AS cchu
                ON cchu.user_id = u.id
            WHERE u.id = $1 LIMIT 1;      
        `, [req.user]);

        console.log(data);
        
        res.json({ data: data.rows });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.get('/chapters', authorize, async (req, res) => {
    console.log('data of a chapters page for students');
    try {
        const chapters = await pool.query(`
            SELECT * FROM course_chapter;
        `);
        console.log(chapters)
        res.json({ chapters: chapters.rows });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.get('/chapter/:chapterId', authorize, async (req, res) => {
    try {
        const chapter = await pool.query(`
            SELECT
                cch.id,
                cch.title AS "title",
                cch.description AS "description",
                cch.content AS "content",
                cch.image_path AS "image",
                cchu.completed AS "completed",
                CASE WHEN EXISTS(
                    SELECT *
                    FROM test AS t
                    INNER JOIN course_chapter AS cch2
                        ON cch2.id = t.course_chapter_id
                    WHERE cch2.id = '6221e544-45a5-4fe8-8347-c10729a77248'
                ) THEN 't'::bool ELSE 'f'::bool END AS "has_test"
            FROM users AS u
            JOIN course_chapter_user AS cchu
                ON cchu.user_id = u.id
            JOIN course_chapter AS cch
                ON cch.id = cchu.course_chapter_id
            WHERE u.id = $1
                AND cchu.course_chapter_id = $2
            UNION ALL
            SELECT
                id,
                title AS "title",
                description AS "description",
                content AS "content",
                image_path AS "image",
                'f'::bool AS "completed",
                CASE WHEN EXISTS(
                    SELECT *
                    FROM test AS t
                    INNER JOIN course_chapter AS cch2
                        ON cch2.id = t.course_chapter_id
                    WHERE cch2.id = $2
                ) THEN 't'::bool ELSE 'f'::bool END AS "has_test"
            FROM course_chapter 
            WHERE id = $2 AND NOT EXISTS(      
                SELECT
                    cch1.id,
                    cch1.title AS "title",
                    cch1.description AS "description",
                    cch1.content AS "content",
                    cch1.image_path AS "image",
                    cchu1.completed AS "completed"
                FROM users AS u1
                JOIN course_chapter_user AS cchu1
                    ON cchu1.user_id = u1.id
                JOIN course_chapter AS cch1
                    ON cch1.id = cchu1.course_chapter_id
                WHERE u1.id = $1
                    AND cchu1.course_chapter_id = $2      
            );
        `, [req.user, req.params.chapterId]);

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

router.post('/complete/chapter/:chapterId', authorize, async (req, res) => {
    try {
        await pool.query(`
        INSERT INTO course_chapter_user (user_id, course_chapter_id, completed, complete_date)
        VALUES ($1, $2, TRUE,  NOW())
        RETURNING *;
        `, [
            req.user,
            req.params.chapterId
        ]);

        
        res.json({ chapterCompleted: true });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            chapterCompleted: false,
            msg: 'Server Error'
        });
    }
});

router.get('/:chapterId/tests/', authorize, async (req, res) => {
    try {
        const tests = await pool.query(`
            SELECT
                t.id, 
                t.title,
                tu.passed AS "passed"
            FROM users AS u
            JOIN test_user AS tu
                ON tu.user_id = u.id
            FULL JOIN test AS t ON t.id = tu.test_id
            WHERE u.id = $1
                AND t.course_chapter_id = $2
            UNION ALL SELECT
                t1.id,
                t1.title,
                NULL AS "passed"
            FROM test AS t1
            JOIN test_user AS tu1
                ON tu1.test_id = t1.id
            WHERE t1.id <> tu1.test_id
                AND t1.course_chapter_id = $2;      
    `, [req.user, req.params.chapterId]).rows;
        
        res.json({
            chapterId: req.params.chapterId,
            tests
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.get('/test/:testId', authorize, async (req, res) => {
    try {
        const test = await pool.query(`
            SELECT
                t.id,
                t.title AS "test",
                tu.attempts AS "attempts",
                tu.passed AS "passed",
                tq.title AS "question",
                ta.title AS "answer",
                ta.correct AS "correct"
            FROM users AS u
            CROSS JOIN test AS t
            JOIN test_user AS tu
                ON tu.test_id = t.id
            JOIN test_question AS tq
                ON tq.test_id = t.id
            JOIN test_answer AS ta
                ON ta.test_question_id = tq.id
            WHERE u.id = $1 AND t.id = $2;
        `, [req.user, req.params.testId]);

        if (test.rows.length !== 0){
            res.json({ test: test.rows[0] });
        } else {
            res.status(404).json('Test Not Found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.post('/enroll/test/:testId', authorize, async (req, res) => {

    try {
        await pool.query(`
            INSERT INTO test_user (user_id, test_id, attempts, passed)
            VALUES ($1, $2, 1::int, $3)
            WHERE NOT EXISTS(
                SELECT * FROM test_user
                WHERE user_id = $1
                    AND test_id = $2
            );
        `, [
            req.user,
            req.params.testId,
            req.body.test.passed
        ]);
        res.json({ testEnrolled: true });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            testEnrolled: false,
            msg: 'Server Error'
        });
    }
});

router.patch('/submit/test/:testId', authorize, async (req, res) => {
    try {
        await pool.query(`
            UPDATE test_user
                SET
                    attempts = $1::bool
                    passed = $2::bool
            WHERE EXISTS(
                    SELECT * FROM test_user
                    WHERE user_id = $3
                        AND test_id = $4
                )
                AND user_id = $3
                AND test_id = $4
            ;  
        `, [
            req.body.test.attempts,
            req.body.test.passed,
            req.user,
            req.params.testId
        ]);
        res.json({ testSubmitted: true });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            testSubmitted: false,
            msg: 'Server Error'
        });
    }
});

router.patch('/pass/test/:testId', authorize, async (req, res) => {
    try {
        await pool.query(`
            UPDATE test_user
            SET passed = 't'::bool
            WHERE EXISTS(
                    SELECT * FROM test_user
                    WHERE user_id = $1
                    AND test_id = $2
                )
                AND user_id = $1
                AND test_id = $2
            ;
        `, [
            req.user,
            req.params.testId
        ]);
        res.json({
            testPassed: true
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            testPassed: false,
            msg: 'Server Error'
        });
    }
});

router.get('/profile', authorize, async (req, res) => {
    try {
        const profile = await pool.query(`
            SELECT
                u.nickname AS "username",
                u.email AS "email", 
                u.password AS "password"
            FROM users AS u
            WHERE u.id = $1;
        `, [req.user]).rows[0];
        res.json({ user: profile });
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.delete('/delete/profile', authorize, async (req, res) => {
    try {
        await pool.query(`
            DELETE FROM users WHERE id = $1
            RETURNING *; 
        `, [req.user]); // req.user since user deletes themselves
        
        res.json({ userDeleted: true });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            userDeleted: false,
            msg: 'Server Error'
        });
    }
});

router.patch('/update/profile', authorize, validate, async (req, res) => {
    try {
        // 1 desctructure the request body

        const {email, password} = req.body;

        // 2 make sure the user with the same identity doesn't exist
        const user = await pool.query(`
            SELECT * FROM users
            WHERE email = $1
        `, [
            email
        ]);

        if (user.rows.length !== 0) {
            // 401 means unathenticated
            return res.status(401).json('User already exists');
        }

        // 3 encrypt the password

        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 4 update the user info inside the db
        const updatedUser = (await pool.query(`
            UPDATE users
            SET
                email = $1,
                password = $2
            WHERE id = $3
            RETURNING *;
        `, [
            req.body.email,
            bcryptPassword,
            req.user
        ])).rows[0];

        // 5 generate jwt token

        const token = jwtGenerator(newUser.rows[0].id, newUser.rows[0].is_admin);
        res.json({
            userUpdated: true,
            user: {
                token, 
                id: updatedUser.id,
                nickname: updatedUser.nickname,
                email: updatedUser.email,
                isAdmin: updatedUser.is_admin
            }
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            userUpdated: false,
            msg: 'Server Error'
        });
    }
});

module.exports = router;