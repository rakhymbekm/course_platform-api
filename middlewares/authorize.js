const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
    try {
        const token = req.header('token');

        if (!token) {
            // 403 - unauthorized
            return res.status(403).json({authorized: false, isAdmin: false, message: "Not Authorized"});
        }

        const payload = jwt.verify(token, process.env.jwtSecret);

        req.user = payload.user;
        req.isAdmin = payload.admin;
    } catch (err) {
        console.log('what is going on?');
        console.log('error obj: ', err);
        console.error(err);
        // 403 - unauthorized
        return res.status(403).json({authorized: false, isAdmin: false, message: "Not Authorized"});
    }

    next();
};