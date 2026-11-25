const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiLinkDB = database.define('antilink', {
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
const warnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiLinkDB() {
    try {
        await AntiLinkDB.sync({ alter: true });
        console.log('AntiLink table ready');
    } catch (error) {
        console.error('Error initializing AntiLink table:', error);
        throw error;
    }
}

async function getAntiLinkSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiLinkDB.findOrCreate({
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
        console.error('Error getting antilink settings:', error);
        return null;
    }
}

async function updateAntiLinkSettings(groupJid, updates) {
    try {
        const settings = await getAntiLinkSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating antilink settings:', error);
        return null;
    }
}

async function getAllAntiLinkGroups() {
    try {
        const settings = await AntiLinkDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all antilink groups:', error);
        return [];
    }
}

function getWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return warnCounts.get(key) || 0;
}

function incrementWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getWarnCount(groupJid, userJid);
    warnCounts.set(key, current + 1);
    return current + 1;
}

function resetWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    warnCounts.delete(key);
}

function clearAllWarns(groupJid) {
    for (const key of warnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            warnCounts.delete(key);
        }
    }
}

function clearAllGroupsWarns() {
    warnCounts.clear();
}

async function toggleAntiLink(groupJid, groupName, status, action = 'warn', warn_limit = 3) {
    try {
        const [settings, created] = await AntiLinkDB.findOrCreate({
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
        console.error('Error toggling antilink:', error);
        return null;
    }
}

module.exports = {
    initAntiLinkDB,
    getAntiLinkSettings,
    updateAntiLinkSettings,
    getAllAntiLinkGroups,
    getWarnCount,
    incrementWarnCount,
    resetWarnCount,
    clearAllWarns,
    clearAllGroupsWarns,
    toggleAntiLink,
    AntiLinkDB
};
