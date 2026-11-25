const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const GroupEventsDB = database.define('groupevents', {
    groupJid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    autoApproveJoin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    autoRejectJoin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    welcomeMessage: {
        type: DataTypes.TEXT,
        defaultValue: "Hey @user 👋\nWelcome to *{group}*.\nYou're member #{count}.\nTime: *{time}*\nDescription: {desc}",
        allowNull: false
    },
    goodbyeMessage: {
        type: DataTypes.TEXT,
        defaultValue: "Goodbye @user 😔\nLeft at: *{time}*\nMembers left: {count}",
        allowNull: false
    },
    showPromotions: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antiPromote: {
        type: DataTypes.ENUM('off', 'on'),
        defaultValue: 'off',
        allowNull: false
    },
    antiPromoteAction: {
        type: DataTypes.ENUM('demote', 'remove', 'warn'),
        defaultValue: 'demote',
        allowNull: false
    },
    antiDemote: {
        type: DataTypes.ENUM('off', 'on'),
        defaultValue: 'off',
        allowNull: false
    },
    antiDemoteAction: {
        type: DataTypes.ENUM('promote', 'remove', 'warn'),
        defaultValue: 'promote',
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
const antiPromoteWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`
const antiDemoteWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initGroupEventsDB() {
    try {
        await GroupEventsDB.sync({ alter: true });
        console.log('GroupEvents table ready');
    } catch (error) {
        console.error('Error initializing GroupEvents table:', error);
        throw error;
    }
}

async function getGroupEventsSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await GroupEventsDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                enabled: false,
                autoApproveJoin: false,
                autoRejectJoin: false,
                welcomeMessage: "Hey @user 👋\nWelcome to *{group}*.\nYou're member #{count}.\nTime: *{time}*\nDescription: {desc}",
                goodbyeMessage: "Goodbye @user 😔\nLeft at: *{time}*\nMembers left: {count}",
                showPromotions: true,
                antiPromote: 'off',
                antiPromoteAction: 'demote',
                antiDemote: 'off',
                antiDemoteAction: 'promote',
                warn_limit: 3
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting group events settings:', error);
        return null;
    }
}

async function updateGroupEventsSettings(groupJid, updates) {
    try {
        const settings = await getGroupEventsSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating group events settings:', error);
        return null;
    }
}

async function getAllGroupEventsGroups() {
    try {
        const settings = await GroupEventsDB.findAll({
            where: { enabled: true },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all group events groups:', error);
        return [];
    }
}

// Anti-Promote warn functions
function getAntiPromoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return antiPromoteWarnCounts.get(key) || 0;
}

function incrementAntiPromoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getAntiPromoteWarnCount(groupJid, userJid);
    antiPromoteWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetAntiPromoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    antiPromoteWarnCounts.delete(key);
}

// Anti-Demote warn functions
function getAntiDemoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return antiDemoteWarnCounts.get(key) || 0;
}

function incrementAntiDemoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getAntiDemoteWarnCount(groupJid, userJid);
    antiDemoteWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetAntiDemoteWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    antiDemoteWarnCounts.delete(key);
}

// Clear all warns for a group
function clearAllWarns(groupJid) {
    for (const key of antiPromoteWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            antiPromoteWarnCounts.delete(key);
        }
    }
    for (const key of antiDemoteWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            antiDemoteWarnCounts.delete(key);
        }
    }
}

module.exports = {
    initGroupEventsDB,
    getGroupEventsSettings,
    updateGroupEventsSettings,
    getAllGroupEventsGroups,
    getAntiPromoteWarnCount,
    incrementAntiPromoteWarnCount,
    resetAntiPromoteWarnCount,
    getAntiDemoteWarnCount,
    incrementAntiDemoteWarnCount,
    resetAntiDemoteWarnCount,
    clearAllWarns,
    GroupEventsDB
};
