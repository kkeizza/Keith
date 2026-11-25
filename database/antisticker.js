const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiStickerDB = database.define('antisticker', {
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
    }
}, {
    timestamps: true
});

// Store warn counts in memory per user per group
const stickerWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiStickerDB() {
    try {
        await AntiStickerDB.sync({ alter: true });
        console.log('AntiSticker table ready');
    } catch (error) {
        console.error('Error initializing AntiSticker table:', error);
        throw error;
    }
}

async function getAntiStickerSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiStickerDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'delete',
                warn_limit: 3
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-sticker settings:', error);
        return null;
    }
}

async function updateAntiStickerSettings(groupJid, updates) {
    try {
        const settings = await getAntiStickerSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-sticker settings:', error);
        return null;
    }
}

async function getAllAntiStickerGroups() {
    try {
        const settings = await AntiStickerDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-sticker groups:', error);
        return [];
    }
}

function getStickerWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return stickerWarnCounts.get(key) || 0;
}

function incrementStickerWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getStickerWarnCount(groupJid, userJid);
    stickerWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetStickerWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    stickerWarnCounts.delete(key);
}

function clearAllStickerWarns(groupJid) {
    for (const key of stickerWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            stickerWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsStickerWarns() {
    stickerWarnCounts.clear();
}

async function toggleAntiSticker(groupJid, groupName, status, action = 'delete', warn_limit = 3) {
    try {
        const [settings, created] = await AntiStickerDB.findOrCreate({
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
                groupName: groupName
            });
        }
        
        return settings;
    } catch (error) {
        console.error('Error toggling anti-sticker:', error);
        return null;
    }
}

module.exports = {
    initAntiStickerDB,
    getAntiStickerSettings,
    updateAntiStickerSettings,
    getAllAntiStickerGroups,
    getStickerWarnCount,
    incrementStickerWarnCount,
    resetStickerWarnCount,
    clearAllStickerWarns,
    clearAllGroupsStickerWarns,
    toggleAntiSticker,
    AntiStickerDB
};
