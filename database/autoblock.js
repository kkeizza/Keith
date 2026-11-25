const { DataTypes } = require('sequelize');
const { database } = require('../settings');

// Main autoblock settings table
const AutoBlockDB = database.define('autoblock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    status: {
        type: DataTypes.ENUM('on', 'off'),
        defaultValue: 'off',
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('block', 'delete', 'warn'),
        defaultValue: 'block',
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    block_message: {
        type: DataTypes.TEXT,
        defaultValue: '🚫 You have been blocked for sending prohibited content.',
        allowNull: false
    }
}, {
    timestamps: true
});

// Trigger words table
const BlockTriggersDB = database.define('blocktriggers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    word: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    added_by: {
        type: DataTypes.STRING,
        allowNull: false
    },
    added_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false
});

// Store warn counts in memory per user
const blockWarnCounts = new Map(); // Key: userJid

async function initAutoBlockDB() {
    try {
        await AutoBlockDB.sync({ alter: true });
        await BlockTriggersDB.sync({ alter: true });
        console.log('AutoBlock tables ready');
    } catch (error) {
        console.error('Error initializing AutoBlock tables:', error);
        throw error;
    }
}

// ===== SETTINGS FUNCTIONS =====

async function getAutoBlockSettings() {
    try {
        const [settings] = await AutoBlockDB.findOrCreate({
            where: {},
            defaults: {
                status: 'off',
                action: 'block',
                warn_limit: 3,
                block_message: '🚫 You have been blocked for sending prohibited content.'
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting autoblock settings:', error);
        return {
            status: 'off',
            action: 'block',
            warn_limit: 3,
            block_message: '🚫 You have been blocked for sending prohibited content.'
        };
    }
}

async function updateAutoBlockSettings(updates) {
    try {
        const settings = await getAutoBlockSettings();
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating autoblock settings:', error);
        return null;
    }
}

// ===== TRIGGER WORDS FUNCTIONS =====

async function addTriggerWord(word, userId) {
    try {
        // Normalize the word (lowercase, trim)
        const normalizedWord = word.toLowerCase().trim();
        
        // Check if word already exists
        const existing = await BlockTriggersDB.findOne({
            where: { word: normalizedWord }
        });
        
        if (existing) {
            return { success: false, message: "Word already in triggers list" };
        }
        
        await BlockTriggersDB.create({
            word: normalizedWord,
            added_by: userId
        });
        
        return { success: true, message: "Trigger word added successfully" };
    } catch (error) {
        console.error('Error adding trigger word:', error);
        return { success: false, message: "Database error" };
    }
}

async function removeTriggerWord(word) {
    try {
        const normalizedWord = word.toLowerCase().trim();
        
        const deleted = await BlockTriggersDB.destroy({
            where: { word: normalizedWord }
        });
        
        return deleted > 0;
    } catch (error) {
        console.error('Error removing trigger word:', error);
        return false;
    }
}

async function getTriggerWords() {
    try {
        const words = await BlockTriggersDB.findAll({
            order: [['word', 'ASC']]
        });
        
        return words.map(w => ({
            word: w.word,
            addedBy: w.added_by,
            addedAt: w.added_at
        }));
    } catch (error) {
        console.error('Error getting trigger words:', error);
        return [];
    }
}

async function clearAllTriggerWords() {
    try {
        const deleted = await BlockTriggersDB.destroy({
            where: {},
            truncate: true
        });
        return true;
    } catch (error) {
        console.error('Error clearing trigger words:', error);
        return false;
    }
}

// ===== DETECTION FUNCTION =====

function containsTriggerWord(text, triggerWordsList) {
    if (!text || !triggerWordsList.length) return false;
    
    const lowerText = text.toLowerCase();
    
    // Check each trigger word
    return triggerWordsList.some(trigger => {
        // Check exact word boundaries
        const regex = new RegExp(`\\b${trigger}\\b`, 'i');
        if (regex.test(lowerText)) return true;
        
        // Check if word appears as part of text
        if (lowerText.includes(trigger)) return true;
        
        return false;
    });
}

// ===== WARN FUNCTIONS =====

function getBlockWarnCount(userJid) {
    return blockWarnCounts.get(userJid) || 0;
}

function incrementBlockWarnCount(userJid) {
    const current = getBlockWarnCount(userJid);
    blockWarnCounts.set(userJid, current + 1);
    return current + 1;
}

function resetBlockWarnCount(userJid) {
    blockWarnCounts.delete(userJid);
}

function clearAllBlockWarns() {
    blockWarnCounts.clear();
}

module.exports = {
    initAutoBlockDB,
    getAutoBlockSettings,
    updateAutoBlockSettings,
    addTriggerWord,
    removeTriggerWord,
    getTriggerWords,
    clearAllTriggerWords,
    containsTriggerWord,
    getBlockWarnCount,
    incrementBlockWarnCount,
    resetBlockWarnCount,
    clearAllBlockWarns,
    AutoBlockDB,
    BlockTriggersDB
};
