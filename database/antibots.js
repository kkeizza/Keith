const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiBotDB = database.define('antibots', {
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
    exempt_admins: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    timestamps: true
});

// Store warn counts in memory per user per group
const botWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiBotDB() {
    try {
        await AntiBotDB.sync({ alter: true });
        console.log('AntiBot table ready');
    } catch (error) {
        console.error('Error initializing AntiBot table:', error);
        throw error;
    }
}

async function getAntiBotSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiBotDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'delete',
                warn_limit: 3,
                exempt_admins: true
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-bot settings:', error);
        return null;
    }
}

async function updateAntiBotSettings(groupJid, updates) {
    try {
        const settings = await getAntiBotSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-bot settings:', error);
        return null;
    }
}

async function getAllAntiBotGroups() {
    try {
        const settings = await AntiBotDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-bot groups:', error);
        return [];
    }
}

function getBotWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return botWarnCounts.get(key) || 0;
}

function incrementBotWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getBotWarnCount(groupJid, userJid);
    botWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetBotWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    botWarnCounts.delete(key);
}

function clearAllBotWarns(groupJid) {
    for (const key of botWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            botWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsBotWarns() {
    botWarnCounts.clear();
}

async function toggleAntiBot(groupJid, groupName, status, action = 'delete', warn_limit = 3, exempt_admins = true) {
    try {
        const [settings, created] = await AntiBotDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: {
                groupJid: groupJid,
                groupName: groupName,
                status: status,
                action: action,
                warn_limit: warn_limit,
                exempt_admins: exempt_admins
            }
        });
        
        if (!created) {
            await settings.update({ 
                status: status,
                action: action,
                warn_limit: warn_limit,
                exempt_admins: exempt_admins,
                groupName: groupName
            });
        }
        
        return settings;
    } catch (error) {
        console.error('Error toggling anti-bot:', error);
        return null;
    }
}

module.exports = {
    initAntiBotDB,
    getAntiBotSettings,
    updateAntiBotSettings,
    getAllAntiBotGroups,
    getBotWarnCount,
    incrementBotWarnCount,
    resetBotWarnCount,
    clearAllBotWarns,
    clearAllGroupsBotWarns,
    toggleAntiBot,
    AntiBotDB
};
