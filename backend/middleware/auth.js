const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sysdesign-visualizer-secret-key-change-in-production';

function generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

// Optional auth — sets req.userId if token exists, but doesn't block
function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
            req.userId = decoded.id;
        } catch (e) { /* ignore */ }
    }
    next();
}

module.exports = { generateToken, authMiddleware, optionalAuth, JWT_SECRET };
