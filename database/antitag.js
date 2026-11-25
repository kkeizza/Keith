const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiTagDB = database.define('antitag', {
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
        type: DataTypes.ENUM('delete', 'remove', 'warn'),
        defaultValue: 'delete',
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    allowed_mentions: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // 0 = no mentions allowed, >0 = max mentions allowed per message
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

// Store warn counts in memory per user per group
const tagWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiTagDB() {
    try {
        await AntiTagDB.sync({ alter: true });
        console.log('AntiTag table ready');
    } catch (error) {
        console.error('Error initializing AntiTag table:', error);
        throw error;
    }
}

async function getAntiTagSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiTagDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'delete',
                warn_limit: 3,
                allowed_mentions: 0,
                exempt_admins: true
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-tag settings:', error);
        return null;
    }
}

async function updateAntiTagSettings(groupJid, updates) {
    try {
        const settings = await getAntiTagSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-tag settings:', error);
        return null;
    }
}

async function getAllAntiTagGroups() {
    try {
        const settings = await AntiTagDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-tag groups:', error);
        return [];
    }
}

function getTagWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return tagWarnCounts.get(key) || 0;
}

function incrementTagWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getTagWarnCount(groupJid, userJid);
    tagWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetTagWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    tagWarnCounts.delete(key);
}

function clearAllTagWarns(groupJid) {
    for (const key of tagWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            tagWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsTagWarns() {
    tagWarnCounts.clear();
}

async function toggleAntiTag(groupJid, groupName, status, action = 'delete', warn_limit = 3, allowed_mentions = 0, exempt_admins = true) {
    try {
        const [settings, created] = await AntiTagDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: {
                groupJid: groupJid,
                groupName: groupName,
                status: status,
                action: action,
                warn_limit: warn_limit,
                allowed_mentions: allowed_mentions,
                exempt_admins: exempt_admins
            }
        });
        
        if (!created) {
            await settings.update({ 
                status: status,
                action: action,
                warn_limit: warn_limit,
                allowed_mentions: allowed_mentions,
                exempt_admins: exempt_admins,
                groupName: groupName
            });
        }
        
        return settings;
    } catch (error) {
        console.error('Error toggling anti-tag:', error);
        return null;
    }
}

module.exports = {
    initAntiTagDB,
    getAntiTagSettings,
    updateAntiTagSettings,
    getAllAntiTagGroups,
    getTagWarnCount,
    incrementTagWarnCount,
    resetTagWarnCount,
    clearAllTagWarns,
    clearAllGroupsTagWarns,
    toggleAntiTag,
    AntiTagDB
};
