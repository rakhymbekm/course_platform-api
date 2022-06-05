module.exports = (req, res, next) => {
    const {email, name, password} = req.body;

    function validateEmail(email) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
    }

    if (req.path === '/signup' || req.path === '/update/profile') {
        if (![email, name, password].every(Boolean)) {
            return res.status(401).json("Missing Credentials");
        } else if (!validateEmail(email)) {
            return res.status(401).json("Invalid Email");
        }
    } else if (req.path === '/signin') {
        if (![email, password].every(Boolean)) {
            return res.status(401).json("Missing Credentials");
        } else if (!validateEmail(email)) {
            return res.status(401).json("Invalid email");
        }
    }

    next();
};