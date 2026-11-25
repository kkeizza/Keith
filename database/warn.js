const { DataTypes } = require('sequelize');
const { database } = require('../settings');

// Warn settings table (per group)
const WarnSettingsDB = database.define('warn_settings', {
    groupJid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('on', 'off'),
        defaultValue: 'on',
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('kick', 'delete'),
        defaultValue: 'kick',
        allowNull: false
    },
    exempt_admins: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    auto_reset_days: {
        type: DataTypes.INTEGER,
        defaultValue: 7, // Reset warns after 7 days
        allowNull: false
    }
}, {
    timestamps: true
});

// Warns table (individual warnings)
const WarnsDB = database.define('warns', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    groupJid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userJid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    warnedBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

// In-memory cache for quick access
const warnCache = new Map(); // Key: `${groupJid}:${userJid}` -> array of warns

async function initWarnDB() {
    try {
        await WarnSettingsDB.sync({ alter: true });
        await WarnsDB.sync({ alter: true });
        console.log('Warn database tables ready');
        
        // Load existing warns into cache
        await refreshWarnCache();
    } catch (error) {
        console.error('Error initializing Warn database:', error);
        throw error;
    }
}

// Refresh cache from database
async function refreshWarnCache() {
    try {
        const allWarns = await WarnsDB.findAll();
        warnCache.clear();
        
        allWarns.forEach(warn => {
            const key = `${warn.groupJid}:${warn.userJid}`;
            if (!warnCache.has(key)) {
                warnCache.set(key, []);
            }
            warnCache.get(key).push({
                id: warn.id,
                warnedBy: warn.warnedBy,
                reason: warn.reason,
                createdAt: warn.createdAt
            });
        });
        
        console.log(`✅ Loaded ${allWarns.length} warns into cache`);
    } catch (error) {
        console.error('Error refreshing warn cache:', error);
    }
}

// ===== SETTINGS FUNCTIONS =====

async function getWarnSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await WarnSettingsDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                warn_limit: 3,
                action: 'kick',
                exempt_admins: true,
                auto_reset_days: 7
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting warn settings:', error);
        return null;
    }
}

async function updateWarnSettings(groupJid, updates) {
    try {
        const settings = await getWarnSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating warn settings:', error);
        return null;
    }
}

async function getAllWarnGroups() {
    try {
        const settings = await WarnSettingsDB.findAll({
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all warn groups:', error);
        return [];
    }
}

// ===== WARN FUNCTIONS =====

async function addWarn(groupJid, userJid, warnedBy, reason = 'No reason provided') {
    try {
        // Check if user is admin and if admins are exempt
        const settings = await getWarnSettings(groupJid);
        
        // Create warn in database
        const warn = await WarnsDB.create({
            groupJid,
            userJid,
            warnedBy,
            reason
        });
        
        // Update cache
        const key = `${groupJid}:${userJid}`;
        if (!warnCache.has(key)) {
            warnCache.set(key, []);
        }
        warnCache.get(key).push({
            id: warn.id,
            warnedBy,
            reason,
            createdAt: warn.createdAt
        });
        
        // Get updated warn count
        const warnCount = await getUserWarnCount(groupJid, userJid);
        
        return {
            success: true,
            warnCount,
            warnId: warn.id,
            limit: settings.warn_limit
        };
    } catch (error) {
        console.error('Error adding warn:', error);
        return { success: false, error: error.message };
    }
}

async function removeWarn(warnId) {
    try {
        const warn = await WarnsDB.findByPk(warnId);
        if (!warn) return false;
        
        const key = `${warn.groupJid}:${warn.userJid}`;
        
        // Remove from database
        await warn.destroy();
        
        // Update cache
        if (warnCache.has(key)) {
            const warns = warnCache.get(key).filter(w => w.id !== warnId);
            if (warns.length === 0) {
                warnCache.delete(key);
            } else {
                warnCache.set(key, warns);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error removing warn:', error);
        return false;
    }
}

async function getUserWarnCount(groupJid, userJid) {
    try {
        const key = `${groupJid}:${userJid}`;
        
        if (warnCache.has(key)) {
            return warnCache.get(key).length;
        }
        
        // If not in cache, get from database
        const count = await WarnsDB.count({
            where: { groupJid, userJid }
        });
        
        return count;
    } catch (error) {
        console.error('Error getting user warn count:', error);
        return 0;
    }
}

async function getUserWarns(groupJid, userJid) {
    try {
        const key = `${groupJid}:${userJid}`;
        
        if (warnCache.has(key)) {
            return warnCache.get(key);
        }
        
        // If not in cache, get from database
        const warns = await WarnsDB.findAll({
            where: { groupJid, userJid },
            order: [['createdAt', 'DESC']]
        });
        
        return warns.map(w => ({
            id: w.id,
            warnedBy: w.warnedBy,
            reason: w.reason,
            createdAt: w.createdAt
        }));
    } catch (error) {
        console.error('Error getting user warns:', error);
        return [];
    }
}

async function getAllWarns(groupJid) {
    try {
        const warns = await WarnsDB.findAll({
            where: { groupJid },
            order: [['createdAt', 'DESC']]
        });
        
        // Group by user
        const grouped = {};
        warns.forEach(warn => {
            if (!grouped[warn.userJid]) {
                grouped[warn.userJid] = [];
            }
            grouped[warn.userJid].push({
                id: warn.id,
                warnedBy: warn.warnedBy,
                reason: warn.reason,
                createdAt: warn.createdAt
            });
        });
        
        return grouped;
    } catch (error) {
        console.error('Error getting all warns:', error);
        return {};
    }
}

async function clearUserWarns(groupJid, userJid) {
    try {
        // Delete from database
        await WarnsDB.destroy({
            where: { groupJid, userJid }
        });
        
        // Clear from cache
        const key = `${groupJid}:${userJid}`;
        warnCache.delete(key);
        
        return true;
    } catch (error) {
        console.error('Error clearing user warns:', error);
        return false;
    }
}

async function clearAllWarns(groupJid) {
    try {
        // Delete from database
        await WarnsDB.destroy({
            where: { groupJid }
        });
        
        // Clear from cache
        for (const key of warnCache.keys()) {
            if (key.startsWith(`${groupJid}:`)) {
                warnCache.delete(key);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing all warns:', error);
        return false;
    }
}

// Auto-reset old warns (can be called periodically)
async function autoResetOldWarns() {
    try {
        const settings = await WarnSettingsDB.findAll();
        const now = new Date();
        
        for (const setting of settings) {
            const days = setting.auto_reset_days;
            const cutoffDate = new Date(now.setDate(now.getDate() - days));
            
            // Delete warns older than cutoff
            await WarnsDB.destroy({
                where: {
                    groupJid: setting.groupJid,
                    createdAt: {
                        [DataTypes.Op.lt]: cutoffDate
                    }
                }
            });
        }
        
        // Refresh cache
        await refreshWarnCache();
        
        console.log('✅ Auto-reset old warns completed');
    } catch (error) {
        console.error('Error auto-resetting warns:', error);
    }
}

module.exports = {
    initWarnDB,
    getWarnSettings,
    updateWarnSettings,
    getAllWarnGroups,
    addWarn,
    removeWarn,
    getUserWarnCount,
    getUserWarns,
    getAllWarns,
    clearUserWarns,
    clearAllWarns,
    autoResetOldWarns,
    WarnSettingsDB,
    WarnsDB
};
