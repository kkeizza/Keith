const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiStatusMentionDB = database.define('antistatusmention', {
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
        type: DataTypes.ENUM('warn', 'delete', 'remove'),
        defaultValue: 'warn',
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    }
}, {
    timestamps: true
});

// Store warn counts in memory per user per group
const statusWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiStatusMentionDB() {
    try {
        await AntiStatusMentionDB.sync({ alter: true });
        console.log('AntiStatusMention table ready');
    } catch (error) {
        console.error('Error initializing AntiStatusMention table:', error);
        throw error;
    }
}

async function getAntiStatusMentionSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiStatusMentionDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'warn',
                warn_limit: 3
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-status-mention settings:', error);
        return null;
    }
}

async function updateAntiStatusMentionSettings(groupJid, updates) {
    try {
        const settings = await getAntiStatusMentionSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-status-mention settings:', error);
        return null;
    }
}

async function getAllAntiStatusMentionGroups() {
    try {
        const settings = await AntiStatusMentionDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-status-mention groups:', error);
        return [];
    }
}

function getStatusWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return statusWarnCounts.get(key) || 0;
}

function incrementStatusWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getStatusWarnCount(groupJid, userJid);
    statusWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetStatusWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    statusWarnCounts.delete(key);
}

function clearAllStatusWarns(groupJid) {
    for (const key of statusWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            statusWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsStatusWarns() {
    statusWarnCounts.clear();
}

async function toggleAntiStatusMention(groupJid, groupName, status, action = 'warn', warn_limit = 3) {
    try {
        const [settings, created] = await AntiStatusMentionDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: {
                groupJid: groupJid,
                groupName: groupName,
                status: status,
                action: action,
                warn_limit: warn_limit
            }
        });
        
        if (!created) {
            await settings.update({ 
                status: status,
                action: action,
                warn_limit: warn_limit,
                groupName: groupName // Update group name in case it changed
            });
        }
        
        return settings;
    } catch (error) {
        console.error('Error toggling anti-status-mention:', error);
        return null;
    }
}

module.exports = {
    initAntiStatusMentionDB,
    getAntiStatusMentionSettings,
    updateAntiStatusMentionSettings,
    getAllAntiStatusMentionGroups,
    getStatusWarnCount,
    incrementStatusWarnCount,
    resetStatusWarnCount,
    clearAllStatusWarns,
    clearAllGroupsStatusWarns,
    toggleAntiStatusMention,
    AntiStatusMentionDB
};
