import User from '../models/User.mjs';
import mongoose from 'mongoose';

// GET /api/profile/me - Get own profile
export async function getProfile(req, res) {
  try {
    const { userId } = req.session;
    
    console.log('[PROFILE] getProfile called:', { userId });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Profile retrieved');
    res.json({ profile: user.toJSON() });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting profile:', err);
    res.status(500).json({
      error: 'An error occurred while fetching profile'
    });
  }
}

// PUT /api/profile/me - Update own profile
export async function updateProfile(req, res) {
  try {
    const { userId } = req.session;
    const { displayName, bio, location, avatarUrl, links } = req.body;

    console.log('[PROFILE] updateProfile called:', { userId, fields: Object.keys(req.body) });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Validate links array
    if (links && Array.isArray(links)) {
      if (links.length > 5) {
        return res.status(400).json({
          error: 'Maximum 5 links allowed'
        });
      }
      
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({
            error: 'Each link must have a url'
          });
        }
      }
    }

    // Update fields if provided
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio ? bio.trim() : "";
    if (location !== undefined) user.location = location ? location.trim() : "";
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (links !== undefined) user.links = links;

    await user.save();
    console.log('[PROFILE] ✓ Profile updated');

    res.json({
      message: 'Profile updated successfully',
      profile: user.toJSON()
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error updating profile:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({
      error: 'An error occurred while updating profile'
    });
  }
}

// GET /api/profile/:username - Get public profile by username
export async function getPublicProfile(req, res) {
  try {
    const { username } = req.params;
    const requesterId = req.session?.userId;

    console.log('[PROFILE] getPublicProfile called:', { username, requesterId });

    const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if account is visible
    if (!user.privacy?.accountVisible) {
      console.log('[PROFILE] ⚠️ Account not visible');
      return res.status(403).json({
        error: 'This profile is not visible'
      });
    }

    // Check if requester is blocked
    if (requesterId && user.blockedUsers?.some(id => id.equals(requesterId))) {
      console.log('[PROFILE] ⚠️ Requester is blocked');
      return res.status(403).json({
        error: 'This profile is not accessible'
      });
    }

    // Build public profile based on privacy settings
    const publicProfile = {
      username: user.username,
      createdAt: user.createdAt
    };

    // Default to showing bio, location, displayName, and links if privacy settings not explicitly set
    const isProfilePublic = user.privacy?.profilePublic !== false; // Default to true
    const publicFields = user.privacy?.publicFields && Array.isArray(user.privacy.publicFields) && user.privacy.publicFields.length > 0
      ? user.privacy.publicFields
      : ['displayName', 'bio', 'location', 'avatarUrl', 'links']; // Default public fields

    if (isProfilePublic) {
      if (publicFields.includes('displayName')) publicProfile.displayName = user.displayName || "";
      if (publicFields.includes('avatarUrl')) publicProfile.avatarUrl = user.avatarUrl || "";
      if (publicFields.includes('links')) publicProfile.links = user.links || [];
    }

    // Bio and location are always public
    publicProfile.bio = user.bio || "";
    publicProfile.location = user.location || "";

    console.log('[PROFILE] Public profile fields:', { isProfilePublic, publicFields, displayName: publicProfile.displayName, bio: publicProfile.bio, location: publicProfile.location, links: publicProfile.links });

    console.log('[PROFILE] ✓ Public profile retrieved');
    res.json({ profile: publicProfile });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting public profile:', err);
    res.status(500).json({
      error: 'An error occurred while fetching profile'
    });
  }
}

// GET /api/profile/preferences - Get preferences
export async function getPreferences(req, res) {
  try {
    const { userId } = req.session;

    console.log('[PROFILE] getPreferences called:', { userId });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Preferences retrieved');
    res.json({ preferences: user.preferences || {} });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting preferences:', err);
    res.status(500).json({
      error: 'An error occurred while fetching preferences'
    });
  }
}

// PUT /api/profile/preferences - Update preferences
export async function updatePreferences(req, res) {
  try {
    const { userId } = req.session;
    const { languages, regions, availabilityWindows, notifications } = req.body;

    console.log('[PROFILE] updatePreferences called:', { userId, fields: Object.keys(req.body) });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update preferences if provided
    if (languages !== undefined) user.preferences.languages = languages;
    if (regions !== undefined) user.preferences.regions = regions;
    if (availabilityWindows !== undefined) {
      // Validate availability windows
      for (const window of availabilityWindows) {
        if (!window.day || !window.startTime || !window.endTime) {
          return res.status(400).json({
            error: 'Each availability window must have day, startTime, and endTime'
          });
        }
      }
      user.preferences.availabilityWindows = availabilityWindows;
    }
    if (notifications !== undefined) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      };
    }

    await user.save();
    console.log('[PROFILE] ✓ Preferences updated');

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error updating preferences:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({
      error: 'An error occurred while updating preferences'
    });
  }
}

// GET /api/profile/privacy - Get privacy settings
export async function getPrivacy(req, res) {
  try {
    const { userId } = req.session;

    console.log('[PROFILE] getPrivacy called:', { userId });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Privacy settings retrieved');
    res.json({ privacy: user.privacy || {} });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting privacy settings:', err);
    res.status(500).json({
      error: 'An error occurred while fetching privacy settings'
    });
  }
}

// PUT /api/profile/privacy - Update privacy settings
export async function updatePrivacy(req, res) {
  try {
    const { userId } = req.session;
    const { profilePublic, publicFields, accountVisible } = req.body;

    console.log('[PROFILE] updatePrivacy called:', { userId, fields: Object.keys(req.body) });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Initialize privacy if not exists
    if (!user.privacy) {
      user.privacy = {};
    }

    // Update privacy settings if provided
    if (profilePublic !== undefined) user.privacy.profilePublic = profilePublic;
    if (publicFields !== undefined) {
      // Validate public fields
      const validFields = ['displayName', 'bio', 'location', 'avatarUrl', 'links', 'stats'];
      for (const field of publicFields) {
        if (!validFields.includes(field)) {
          return res.status(400).json({
            error: `Invalid public field: ${field}`
          });
        }
      }
      user.privacy.publicFields = publicFields;
    }
    if (accountVisible !== undefined) user.privacy.accountVisible = accountVisible;

    await user.save();
    console.log('[PROFILE] ✓ Privacy settings updated');

    res.json({
      message: 'Privacy settings updated successfully',
      privacy: user.privacy
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error updating privacy settings:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({
      error: 'An error occurred while updating privacy settings'
    });
  }
}

// GET /api/profile/stats - Get stats
export async function getStats(req, res) {
  try {
    const { userId } = req.session;

    console.log('[PROFILE] getStats called:', { userId });

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Stats retrieved');
    res.json({ stats: user.stats || {} });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting stats:', err);
    res.status(500).json({
      error: 'An error occurred while fetching stats'
    });
  }
}

// Internal function to update stats after debate
export async function updateStats(userId, won) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.stats) {
      user.stats = {
        roundsPlayed: 0,
        wins: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    user.stats.roundsPlayed += 1;
    
    if (won) {
      user.stats.wins += 1;
      user.stats.currentStreak += 1;
      if (user.stats.currentStreak > user.stats.longestStreak) {
        user.stats.longestStreak = user.stats.currentStreak;
      }
    } else {
      user.stats.currentStreak = 0;
    }

    await user.save();
    console.log('[PROFILE] ✓ Stats updated for user:', userId);
  } catch (err) {
    console.error('[PROFILE] ❌ Error updating stats:', err);
  }
}

// POST /api/profile/block/:userId - Block a user
export async function blockUser(req, res) {
  try {
    const { userId } = req.session;
    const { userId: targetUserId } = req.params;

    console.log('[PROFILE] blockUser called:', { userId, targetUserId });

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    if (userId === targetUserId) {
      return res.status(400).json({
        error: 'Cannot block yourself'
      });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);
    
    if (!user || !targetUser) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if already blocked
    if (user.blockedUsers?.some(id => id.equals(targetUserId))) {
      return res.status(400).json({
        error: 'User is already blocked'
      });
    }

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    user.blockedUsers.push(targetUserId);
    await user.save();

    console.log('[PROFILE] ✓ User blocked');
    res.json({
      message: 'User blocked successfully',
      blockedUsers: user.blockedUsers
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error blocking user:', err);
    res.status(500).json({
      error: 'An error occurred while blocking user'
    });
  }
}

// DELETE /api/profile/block/:userId - Unblock a user
export async function unblockUser(req, res) {
  try {
    const { userId } = req.session;
    const { userId: targetUserId } = req.params;

    console.log('[PROFILE] unblockUser called:', { userId, targetUserId });

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (!user.blockedUsers || !user.blockedUsers.some(id => id.equals(targetUserId))) {
      return res.status(400).json({
        error: 'User is not blocked'
      });
    }

    user.blockedUsers = user.blockedUsers.filter(id => !id.equals(targetUserId));
    await user.save();

    console.log('[PROFILE] ✓ User unblocked');
    res.json({
      message: 'User unblocked successfully',
      blockedUsers: user.blockedUsers
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error unblocking user:', err);
    res.status(500).json({
      error: 'An error occurred while unblocking user'
    });
  }
}

// GET /api/profile/blocked - Get blocked users list
export async function getBlockedUsers(req, res) {
  try {
    const { userId } = req.session;

    console.log('[PROFILE] getBlockedUsers called:', { userId });

    const user = await User.findById(userId).populate('blockedUsers', 'username displayName avatarUrl');
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Blocked users retrieved');
    res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting blocked users:', err);
    res.status(500).json({
      error: 'An error occurred while fetching blocked users'
    });
  }
}

// POST /api/profile/mute/:userId - Mute a user
export async function muteUser(req, res) {
  try {
    const { userId } = req.session;
    const { userId: targetUserId } = req.params;

    console.log('[PROFILE] muteUser called:', { userId, targetUserId });

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    if (userId === targetUserId) {
      return res.status(400).json({
        error: 'Cannot mute yourself'
      });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);
    
    if (!user || !targetUser) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if already muted
    if (user.mutedUsers?.some(id => id.equals(targetUserId))) {
      return res.status(400).json({
        error: 'User is already muted'
      });
    }

    if (!user.mutedUsers) {
      user.mutedUsers = [];
    }

    user.mutedUsers.push(targetUserId);
    await user.save();

    console.log('[PROFILE] ✓ User muted');
    res.json({
      message: 'User muted successfully',
      mutedUsers: user.mutedUsers
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error muting user:', err);
    res.status(500).json({
      error: 'An error occurred while muting user'
    });
  }
}

// DELETE /api/profile/mute/:userId - Unmute a user
export async function unmuteUser(req, res) {
  try {
    const { userId } = req.session;
    const { userId: targetUserId } = req.params;

    console.log('[PROFILE] unmuteUser called:', { userId, targetUserId });

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (!user.mutedUsers || !user.mutedUsers.some(id => id.equals(targetUserId))) {
      return res.status(400).json({
        error: 'User is not muted'
      });
    }

    user.mutedUsers = user.mutedUsers.filter(id => !id.equals(targetUserId));
    await user.save();

    console.log('[PROFILE] ✓ User unmuted');
    res.json({
      message: 'User unmuted successfully',
      mutedUsers: user.mutedUsers
    });
  } catch (err) {
    console.error('[PROFILE] ❌ Error unmuting user:', err);
    res.status(500).json({
      error: 'An error occurred while unmuting user'
    });
  }
}

// GET /api/profile/muted - Get muted users list
export async function getMutedUsers(req, res) {
  try {
    const { userId } = req.session;

    console.log('[PROFILE] getMutedUsers called:', { userId });

    const user = await User.findById(userId).populate('mutedUsers', 'username displayName avatarUrl');
    
    if (!user) {
      console.log('[PROFILE] ❌ User not found');
      return res.status(404).json({
        error: 'User not found'
      });
    }

    console.log('[PROFILE] ✓ Muted users retrieved');
    res.json({ mutedUsers: user.mutedUsers || [] });
  } catch (err) {
    console.error('[PROFILE] ❌ Error getting muted users:', err);
    res.status(500).json({
      error: 'An error occurred while fetching muted users'
    });
  }
}
