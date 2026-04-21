/**
 * Middleware for protecting staff routes and APIs.
 */
function requireStaff(req, res, next) {
    if (!req.session.staffLoggedIn) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        return res.redirect('/staff/login');
    }
    next();
}

module.exports = { requireStaff };
