export function requireAuth(req, res, next) {
  console.log('[AUTH] Checking auth:', {
    sessionExists: !!req.session,
    sessionId: req.sessionID,
    userId: req.session?.userId,
    username: req.session?.username,
    method: req.method,
    path: req.path,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });

  if (!req.session || !req.session.userId) {
    console.log('[AUTH] ❌ Auth failed - no session/userId');
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  console.log('[AUTH] ✓ Auth passed for user:', req.session.username);
  next();
}
