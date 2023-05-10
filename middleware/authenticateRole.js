const jwt = require("jsonwebtoken");

function authenticateRole (req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    // console.log(req.headers.authorization);
    if(token == null) return res.status(401).json({ status: 401, message: "Unauthorized" });

    // verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
        if(err) return res.status(403).json({ status: 403, message: "Forbidden", error: err });        
        req.user = decodedToken;
        next();
    });    
}

module.exports = { authenticateRole };