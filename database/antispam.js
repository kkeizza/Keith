const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiSpamDB = database.define('antispam', {
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
        type: DataTypes.ENUM('off', 'on'),
        defaultValue: 'off',
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('delete', 'remove', 'kick', 'warn'),
        defaultValue: 'warn',
        allowNull: false
    },
    message_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 5, // Number of messages allowed
        allowNull: false
    },
    time_window: {
        type: DataTypes.INTEGER,
        defaultValue: 5, // Time window in seconds
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    exempt_admins: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    timestamps: true
});

// Store message timestamps per user per group
const userMessages = new Map(); // Key: `${groupJid}:${userJid}` -> Array of timestamps

// Store warn counts per user per group
const spamWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiSpamDB() {
    try {
        await AntiSpamDB.sync({ alter: true });
        console.log('AntiSpam table ready');
    } catch (error) {
        console.error('Error initializing AntiSpam table:', error);
        throw error;
    }
}

async function getAntiSpamSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiSpamDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'warn',
                message_limit: 5,
                time_window: 5,
                warn_limit: 3,
                exempt_admins: true
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-spam settings:', error);
        return null;
    }
}

async function updateAntiSpamSettings(groupJid, updates) {
    try {
        const settings = await getAntiSpamSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-spam settings:', error);
        return null;
    }
}

async function getAllAntiSpamGroups() {
    try {
        const settings = await AntiSpamDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-spam groups:', error);
        return [];
    }
}

// ===== MESSAGE TRACKING FUNCTIONS =====

function addUserMessage(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const now = Date.now();
    
    if (!userMessages.has(key)) {
        userMessages.set(key, []);
    }
    
    const timestamps = userMessages.get(key);
    timestamps.push(now);
    
    // Keep only last 20 messages to prevent memory issues
    if (timestamps.length > 20) {
        timestamps.shift();
    }
}

function getUserMessageCount(groupJid, userJid, timeWindowSeconds) {
    const key = `${groupJid}:${userJid}`;
    const now = Date.now();
    const timeWindowMs = timeWindowSeconds * 1000;
    
    if (!userMessages.has(key)) return 0;
    
    const timestamps = userMessages.get(key);
    
    // Filter messages within the time window
    const recentMessages = timestamps.filter(time => now - time <= timeWindowMs);
    
    // Update the stored array to only keep recent messages
    userMessages.set(key, recentMessages);
    
    return recentMessages.length;
}

function clearUserMessages(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    userMessages.delete(key);
}

function clearAllGroupMessages(groupJid) {
    for (const key of userMessages.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            userMessages.delete(key);
        }
    }
}

// ===== WARN FUNCTIONS =====

function getSpamWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return spamWarnCounts.get(key) || 0;
}

function incrementSpamWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getSpamWarnCount(groupJid, userJid);
    spamWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetSpamWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    spamWarnCounts.delete(key);
}

function clearAllSpamWarns(groupJid) {
    for (const key of spamWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            spamWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsSpamWarns() {
    userMessages.clear();
    spamWarnCounts.clear();
}

module.exports = {
    initAntiSpamDB,
    getAntiSpamSettings,
    updateAntiSpamSettings,
    getAllAntiSpamGroups,
    addUserMessage,
    getUserMessageCount,
    clearUserMessages,
    clearAllGroupMessages,
    getSpamWarnCount,
    incrementSpamWarnCount,
    resetSpamWarnCount,
    clearAllSpamWarns,
    clearAllGroupsSpamWarns,
    AntiSpamDB
};
