const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwtGenerator = require('../utils/jwtGenerator');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const multer = require('multer');
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads');
    },
    filename(req, file, cb) {
        const ext = file.originalname
                    .substring(
                        file.originalname
                        .lastIndexOf('.')
        );
        const f = file.originalname
                    .substring(
                        0,
                        file.originalname
                        .lastIndexOf('.')
                    )
                    .split(' ')
                    .join('_')
                    .split('.')
                    .join('_');

        cb(
            null,
            new Date()
            .toISOString()
            .split('-')
            .join('_')
            .split(':')
            .join('_')
            .split('.')
            .join('_')
            + '__'
            + f
            + ext
        );
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        cb(null, true);
    }

    cb(null, false);
};

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 30
    },
    fileFilter
});

router.get('/', authorize, async (req, res) => {
    console.log('data of a home page for the admin');
    try {

        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }

        const chapters = await pool.query(`
            SELECT * FROM course_chapter;
        `);
        
        res.json({ chapters: chapters.rows });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.post(
    '/new/chapter',
    authorize,
    async (req, res) => {
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }

    try {
        const insertedChapter = (await pool.query(`
            INSERT INTO
                course_chapter(
                    title,
                    description,
                    content
            ) VALUES ($1, $2, $3)
            RETURNING *;`, [
            req.body.title,
            req.body.description,
            req.body.content
        ])).rows[0];
        
        res.json({
            chapterCreated: true,
            chapter: insertedChapter
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            chapterCreated: false,
            msg: 'Server Error'
        });
    }
});

router.get('/chapter/:chapterId', authorize, async (req, res) => {
    try {

        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }
        const chapter = await pool.query(`
            SELECT 
                title AS "title",
                description AS "description",
                content AS "content",
                image_path AS "image",
                CASE WHEN EXISTS(
                    SELECT *
                    FROM test AS t
                    INNER JOIN course_chapter AS cch2
                        ON cch2.id = t.course_chapter_id
                    WHERE cch2.id = $1
                ) THEN 't'::bool ELSE 'f'::bool END AS "has_test"
            FROM course_chapter 
            WHERE id = $1;
        `, [req.params.chapterId]);

        console.log(chapter);

        if(chapter.rows.length !== 0) {
            return res.json({ chapter: chapter.rows[0] });
        }
 
        res.status(404).json({chapterExists: false });
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.patch(
    '/update/chapter/:chapterId',
    authorize,
    upload.single('chapter_image'),
    async (req, res) => {
        console.log('try to update chapter');
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }
    
    try {
        const updatedChapter = (await pool.query(`
            UPDATE course_chapter
            SET
                title = $1,
                description = $2,
                content = $3,
            WHERE id = $4
            RETURNING *;
        `, [
            req.body.title,
            req.body.description,
            req.body.content,
            req.params.chapterId
        ])).rows[0];
        
        res.json({
            chapterUpdated: true,
            chapter: updatedChapter
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            chapterUpdated: false,
            msg: 'Server Error'
        });
    }
});

router.delete('/delete/chapter/:chapterId', authorize, async (req, res) => {
    try {
        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }

        const deletedChapter = (await pool.query(`
            DELETE FROM course_chapter
            WHERE id = $1
            RETURNING *;
        `, [req.params.chapterId])).rows[0];
        
        res.json({
            chapterDeleted: true,
            chapter: deletedChapter
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            chapterDeleted: false,
            msg: 'Server Error'
        });
    }
});

router.get('/:chapterId/tests', authorize, async (req, res) => {
    try {

        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }

        const tests = await pool.query(`
            SELECT
                t.id, 
                t.title
            FROM test AS t
            WHERE t.course_chapter_id = $1;
        `, [req.params.chapterId]).rows;
        
        res.json({
            chapterId: req.params.chapterId,
            tests
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.post('/new/test', authorize, async (req, res) => {
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }

    try {
        if (!req.body.title || !req.body.chapterId
            || !req.body.questions
            || !Array.isArray(req.body.questions)
            || !req.body.questions[0].title
            || !req.body.questions[0].answers
            || ! Array.isArray(req.body.questions[0].answers)
            || !req.body.questions[0].answers[0].title
            || !req.body.questions[0].answers[0].correct) {
            res.status(406).send("Please send valid data");
        }
/*

Expected data:
{
    title,
    chapterId,
    questions: [
        {
            title,
            answers: [
                {
                    title,
                    correct
                },
                {
                    title,
                    correct
                },
                ...
            ],
            ...
        },
        {
            title,
            answers: [
                {
                    title,
                    correct
                },
                {
                    title,
                    correct
                },
                ...
            ]
        }
    ]
}

*/


        // preparing query
        let query = `
            WITH
                test_key AS (
                    INSERT INTO
                        test (title, course_chapter_id)
                    VALUES
                        (${req.body.title},
                        ${req.body.chapterId})
                    RETURNING id
                ),
                question_key AS (
                    INSERT INTO 
                        test_question (title, test_id)
                    VALUES
        `;

        req.body.questions.forEAch(question => {
            query += `

                        (${question.title},
                        (SELECT id FROM test_key))
                    RETURNING id
                )
            INSERT INTO
                test_answer (title, correct, test_question_id)
            VALUES
            `;
            
            question.answers.forEAch(answer => {
                query += `
                (${answer.title}, ${answer.correct}, (SELECT id FROM question_key))
                `;
            });

            query += ';';
        });
        
        // doing a request
        await pool.query(query);
        
        res.json({testCreated: true});
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            msg: 'Server Error',
            testCreated: false
        });
    }
});

router.get('/test/:testId', authorize, async (req, res) => {
    try {

        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }

        const test = await pool.query(`
            SELECT
                t.id AS "testId",
                tq.id AS "questionId"
                ta.id AS "answerId",
                t.title AS "test",
                tq.title AS "question",
                ta.title AS "answer",
                ta.correct AS "correct",
                t.course_chapter_id AS "chapterId"
            FROM test AS t
            JOIN test_question AS tq
                ON tq.test_id = t.id
            JOIN test_answer AS ta
                ON ta.test_question_id = tq.id
            WHERE t.id = $1;          
        `,[req.params.testId]).rows[0];

        res.json({test});
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.patch('/update/test/:testId', authorize, async (req, res) => {
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }
    
    try {


/*

Expected data:
{
    id,
    title,
    chapterId,
    questions: [
        {
            id,
            title,
            answers: [
                {
                    id,
                    title,
                    correct
                },
                {
                    id,
                    title,
                    correct
                },
                ...
            ],
            ...
        },
        {
            id,
            title,
            answers: [
                {
                    id,
                    title,
                    correct
                },
                {
                    id,
                    title,
                    correct
                },
                ...
            ]
        }
    ]
}

*/

        let query = `        
            BEGIN;
                UPDATE test
                    SET title = ${req.body.test.title}
                WHERE id = ${req.body.test.id};
        `;

        req.body.test.questions.forEAch(question => {
            query += `
                UPDATE test_question
                    SET title = ${question.title}
                WHERE id = ${question.id};
            `;

            question.answers.forEAch(answer => {
                query += `
                    UPDATE test_answer
                        SET
                            title = ${answer.title},
                            correct = ${answer.correct}
                    WHERE id = ${answer.id};
                `;
            });
        });

        query += `
            COMMIT;
        `;
        await pool.query(query);
        
        res.json({ testUpdated: true });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            testUpdated: false,
            msg: 'Server Error'
        });
    }
});

router.delete('/delete/test/:testId', authorize, async (req, res) => {
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }

    try {
        await pool.query(`
            DELETE FROM test WHERE id = $1
            AND id = $2
            RETURNING *;
        `, [req.user, req.params.testId]);
        
        res.json({
            testDeleted: true
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            testDeleted: false,
            msg: 'Server Error'
        });
    }
});

router.get('/users', authorize, async (req, res) => {
    try {
        if (!req.isAdmin) {
            res.status(403).json("Not Authorized");
        }

        const users = await pool.query(`
            SELECT
                u.nickname AS "username"
            FROM users AS u
            WHERE NOT u.is_admin;
        `).rows;
        res.json({ users });
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
});

router.delete('/delete/user/:userId', authorize, async (req, res) => {
    if (!req.isAdmin) {
        res.status(403).json("Not Authorized");
    }

    try {
        const deletedUser = (await pool.query(`
            DELETE FROM users
            WHERE id = $1
            RETURNING *;
        `, [req.params.userId])).rows[0];
        
        res.json({
            userDeleted: true, 
            user
        });
    } catch (err) {
        
        console.error(err.message);
        res.status(500).json({
            userDeleted: false,
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
        `, [req.user]).rows;
        res.json({ profile });
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
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