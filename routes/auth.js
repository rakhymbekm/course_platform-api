const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwtGenerator = require('../utils/jwtGenerator');
const validate = require('../middlewares/validate');
const authorize = require('../middlewares/authorize');

router.post('/signup', validate, async (req, res) => {
    try {

        // 1 desctructure the request body

        const {nickname, email, password} = req.body;

        console.log(req.body);

        // 2 make sure the user with the same identity doesn't exist
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [
            email
        ]);

        if (user.rows.length !== 0) {
            // 401 means unathenticated
            console.log('user already exists');
            return res.status(401).json('User already exists');
        }

        // 3 encrypt the password

        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 4 enter the new user inside the db
        const newUser = await pool.query('INSERT INTO users (nickname, email,  password, is_admin) VALUES ($1, $2, $3, false) RETURNING *;', [
            nickname, email, bcryptPassword
        ]);

        // 5 generate jwt token
        console.log('preparing token');
        const token = jwtGenerator(newUser.rows[0].id, newUser.rows[0].is_admin);
        res.json({
            token, 
            id: newUser.rows[0].id,
            nickname: newUser.rows[0].nickname,
            email: newUser.rows[0].email,
            isAdmin: newUser.rows[0].is_admin
        });

    } catch (err) {
        console.log('some shit happened');
        console.error(err.message);
        res.status(500).json("Server error");
    }
});

router.post('/signin', validate, async (req, res) => {
    try {

        // 1 desctructure the request body
        const {email, password} = req.body;

        // 2 make sure the user with the given identity exists

        const user = await pool.query('SELECT * FROM users WHERE email=$1', [
            email
        ]);
        
        if (user.rows.length === 0) {
            // 401 means unathenticated
            return res.status(401).json("Password or email is incorrect");
        }

        // 3 check if incoming password is the same as the password in the db

        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            console.log('pass or em is not correct for sure');
            return res.status(401).json("Password or email is incorrect");
        }

        // 4 give them the jwt
        const token = jwtGenerator(user.rows[0].id, user.rows[0].is_admin);

        res.json({
            token,
            id: user.rows[0].id,
            nickname: user.rows[0].nickname,
            email: user.rows[0].email,
            isAdmin: user.rows[0].is_admin
        });

    } catch(err) {
        console.error(err.message);
        res.status(500).json("Server error");
    }
});

router.get('/verified', authorize, async (req, res) => {
    console.log('verified');
    try {
        res.json({
            authorized: true,
            isAdmin: req.isAdmin
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({authorized: false, isAdmin: false, message: err.message});
    }
})

module.exports = router;