const jwt = require('jsonwebtoken');
require('dotenv').config();

function jwtGenerator(user_id, is_admin) {
    const payload = {
        user: user_id,
        admin: is_admin
    }
    
    return jwt.sign(payload, process.env.jwtSecret, {expiresIn: 60 * 60});
}

module.exports = jwtGenerator;