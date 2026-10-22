import User from '../models/User.mjs';

export async function register(req, res) {
  try {
    console.log('[AUTH] register called with:', {
      email: req.body?.email,
      username: req.body?.username,
      hasPassword: !!req.body?.password
    });

    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username, and password are required'
      });
    }

    if (username.trim().length < 3 || username.trim().length > 30) {
      return res.status(400).json({
        error: 'Username must be between 3 and 30 characters long'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'A user with this email or username already exists'
      });
    }

    const user = new User({
      email,
      username,
      password
    });

    await user.save();
    console.log('[AUTH] ✓ User registered:', { email, username, userId: user._id });

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON()
    });
  } catch (err) {
    console.error('[AUTH] ❌ Registration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((e) => e.message).join('; ')
      });
    }
    res.status(500).json({
      error: 'An error occurred during registration'
    });
  }
}

export async function login(req, res) {
  try {
    console.log('[AUTH] login called with:', {
      email: req.body?.email,
      hasPassword: !!req.body?.password
    });

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      console.log('[AUTH] ❌ Login failed: invalid credentials');
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    
    console.log('[AUTH] ✓ User logged in:', { 
      email, 
      username: user.username, 
      userId: user._id,
      sessionId: req.sessionID 
    });

    res.json({
      message: 'Login successful',
      user: user.toJSON()
    });
  } catch (err) {
    console.error('[AUTH] ❌ Login error:', err);
    res.status(500).json({
      error: 'An error occurred during login'
    });
  }
}

export async function logout(req, res) {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: 'An error occurred during logout'
        });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      error: 'An error occurred during logout'
    });
  }
}

export async function getMe(req, res) {
  try {
    console.log('[AUTH] getMe called:', {
      userId: req.session?.userId,
      username: req.session?.username,
      sessionId: req.sessionID
    });

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      console.log('[AUTH] ❌ getMe failed: user not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[AUTH] ✓ getMe successful:', { username: user.username });
    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('[AUTH] ❌ Get user error:', err);
    res.status(500).json({
      error: 'An error occurred while fetching user data'
    });
  }
}
