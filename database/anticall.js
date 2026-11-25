const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const AntiCallDB = database.define('anticall', {
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        defaultValue: '📵 Calls are not accepted! Please text instead.',
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('reject', 'block', 'warn'),
        defaultValue: 'reject',
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

// Store call counts and warn counts in memory per user
const callCounts = new Map(); // Track number of calls per user
const callWarnCounts = new Map(); // Track warn counts per user

async function initAntiCallDB() {
    try {
        await AntiCallDB.sync({ alter: true });
        console.log('AntiCall table ready');
    } catch (error) {
        console.error('Error initializing AntiCall table:', error);
        throw error;
    }
}

async function getAntiCallSettings() {
    try {
        const settings = await AntiCallDB.findOne();
        if (!settings) {
            return await AntiCallDB.create({});
        }
        return settings;
    } catch (error) {
        console.error('Error getting anti-call settings:', error);
        return { 
            status: true, 
            message: '📵 Calls are not accepted! Please text instead.', 
            action: 'reject',
            warn_limit: 3
        };
    }
}

async function updateAntiCallSettings(updates) {
    try {
        const settings = await getAntiCallSettings();
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-call settings:', error);
        return null;
    }
}

// ===== CALL TRACKING FUNCTIONS =====

function getCallCount(userJid) {
    return callCounts.get(userJid) || 0;
}

function incrementCallCount(userJid) {
    const current = getCallCount(userJid);
    callCounts.set(userJid, current + 1);
    return current + 1;
}

function resetCallCount(userJid) {
    callCounts.delete(userJid);
}

function getCallWarnCount(userJid) {
    return callWarnCounts.get(userJid) || 0;
}

function incrementCallWarnCount(userJid) {
    const current = getCallWarnCount(userJid);
    callWarnCounts.set(userJid, current + 1);
    return current + 1;
}

function resetCallWarnCount(userJid) {
    callWarnCounts.delete(userJid);
}

function clearAllCallWarns() {
    callCounts.clear();
    callWarnCounts.clear();
}

module.exports = {
    initAntiCallDB,
    getAntiCallSettings,
    updateAntiCallSettings,
    getCallCount,
    incrementCallCount,
    resetCallCount,
    getCallWarnCount,
    incrementCallWarnCount,
    resetCallWarnCount,
    clearAllCallWarns,
    AntiCallDB
};
