const { DataTypes } = require('sequelize');
const { database } = require('../settings');

// Main antibad settings table
const AntiBadDB = database.define('antibad', {
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
    filter_type: {
        type: DataTypes.ENUM('strict', 'normal', 'loose'),
        defaultValue: 'normal',
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

// Bad words list table
const BadWordsDB = database.define('badwords', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    groupJid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    word: {
        type: DataTypes.STRING,
        allowNull: false
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

// Store warn counts in memory per user per group
const badWarnCounts = new Map(); // Key: `${groupJid}:${userJid}`

async function initAntiBadDB() {
    try {
        await AntiBadDB.sync({ alter: true });
        await BadWordsDB.sync({ alter: true });
        console.log('AntiBad tables ready');
    } catch (error) {
        console.error('Error initializing AntiBad tables:', error);
        throw error;
    }
}

// ===== SETTINGS FUNCTIONS =====

async function getAntiBadSettings(groupJid) {
    try {
        if (!groupJid) return null;
        
        const [settings] = await AntiBadDB.findOrCreate({
            where: { groupJid: groupJid },
            defaults: { 
                groupJid: groupJid,
                status: 'off',
                action: 'delete',
                warn_limit: 3,
                filter_type: 'normal',
                exempt_admins: true
            }
        });
        return settings;
    } catch (error) {
        console.error('Error getting anti-bad settings:', error);
        return null;
    }
}

async function updateAntiBadSettings(groupJid, updates) {
    try {
        const settings = await getAntiBadSettings(groupJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-bad settings:', error);
        return null;
    }
}

async function getAllAntiBadGroups() {
    try {
        const settings = await AntiBadDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return settings;
    } catch (error) {
        console.error('Error getting all anti-bad groups:', error);
        return [];
    }
}

// ===== BAD WORDS FUNCTIONS =====

async function addBadWord(groupJid, word, userId) {
    try {
        // Normalize the word (lowercase, trim)
        const normalizedWord = word.toLowerCase().trim();
        
        // Check if word already exists for this group
        const existing = await BadWordsDB.findOne({
            where: {
                groupJid: groupJid,
                word: normalizedWord
            }
        });
        
        if (existing) {
            return { success: false, message: "Word already in list" };
        }
        
        await BadWordsDB.create({
            groupJid: groupJid,
            word: normalizedWord,
            added_by: userId
        });
        
        return { success: true, message: "Word added successfully" };
    } catch (error) {
        console.error('Error adding bad word:', error);
        return { success: false, message: "Database error" };
    }
}

async function removeBadWord(groupJid, word) {
    try {
        const normalizedWord = word.toLowerCase().trim();
        
        const deleted = await BadWordsDB.destroy({
            where: {
                groupJid: groupJid,
                word: normalizedWord
            }
        });
        
        return deleted > 0;
    } catch (error) {
        console.error('Error removing bad word:', error);
        return false;
    }
}

async function getBadWords(groupJid) {
    try {
        const words = await BadWordsDB.findAll({
            where: { groupJid: groupJid },
            order: [['word', 'ASC']]
        });
        
        return words.map(w => ({
            word: w.word,
            addedBy: w.added_by,
            addedAt: w.added_at
        }));
    } catch (error) {
        console.error('Error getting bad words:', error);
        return [];
    }
}

async function clearAllBadWords(groupJid) {
    try {
        const deleted = await BadWordsDB.destroy({
            where: { groupJid: groupJid }
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error clearing bad words:', error);
        return false;
    }
}

// ===== WORD DETECTION FUNCTIONS =====

function containsBadWord(text, badWordsList, filterType = 'normal') {
    if (!text || !badWordsList.length) return false;
    
    const lowerText = text.toLowerCase();
    
    switch (filterType) {
        case 'strict':
            // Check exact word boundaries
            return badWordsList.some(badWord => {
                const regex = new RegExp(`\\b${badWord}\\b`, 'i');
                return regex.test(lowerText);
            });
            
        case 'loose':
            // Check if word appears anywhere (even as part of another word)
            return badWordsList.some(badWord => lowerText.includes(badWord));
            
        case 'normal':
        default:
            // Check with some intelligence - word boundaries or common variations
            return badWordsList.some(badWord => {
                // Check exact word
                if (lowerText.includes(` ${badWord} `) || 
                    lowerText.startsWith(`${badWord} `) || 
                    lowerText.endsWith(` ${badWord}`) ||
                    lowerText === badWord) {
                    return true;
                }
                
                // Check with common leetspeak substitutions
                const leetVariations = generateLeetVariations(badWord);
                return leetVariations.some(variation => lowerText.includes(variation));
            });
    }
}

// Helper to generate common leetspeak variations
function generateLeetVariations(word) {
    const substitutions = {
        'a': ['a', '4', '@'],
        'b': ['b', '8', '13'],
        'c': ['c', '(', '<', 'k'],
        'e': ['e', '3', '&'],
        'g': ['g', '6', '9'],
        'i': ['i', '1', '!', '|'],
        'l': ['l', '1', '|', '7'],
        'o': ['o', '0', '()'],
        's': ['s', '5', '$', 'z'],
        't': ['t', '7', '+'],
        'z': ['z', '2']
    };
    
    // For simplicity, generate common variations
    const variations = [word];
    
    // Replace 'a' with '@' or '4'
    if (word.includes('a')) {
        variations.push(word.replace(/a/g, '@'));
        variations.push(word.replace(/a/g, '4'));
    }
    
    // Replace 'e' with '3'
    if (word.includes('e')) {
        variations.push(word.replace(/e/g, '3'));
    }
    
    // Replace 'i' with '1' or '!'
    if (word.includes('i')) {
        variations.push(word.replace(/i/g, '1'));
        variations.push(word.replace(/i/g, '!'));
    }
    
    // Replace 's' with '5' or '$'
    if (word.includes('s')) {
        variations.push(word.replace(/s/g, '5'));
        variations.push(word.replace(/s/g, '$'));
    }
    
    // Replace 'o' with '0'
    if (word.includes('o')) {
        variations.push(word.replace(/o/g, '0'));
    }
    
    return [...new Set(variations)]; // Remove duplicates
}

// ===== WARN FUNCTIONS =====

function getBadWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    return badWarnCounts.get(key) || 0;
}

function incrementBadWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    const current = getBadWarnCount(groupJid, userJid);
    badWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetBadWarnCount(groupJid, userJid) {
    const key = `${groupJid}:${userJid}`;
    badWarnCounts.delete(key);
}

function clearAllBadWarns(groupJid) {
    for (const key of badWarnCounts.keys()) {
        if (key.startsWith(`${groupJid}:`)) {
            badWarnCounts.delete(key);
        }
    }
}

function clearAllGroupsBadWarns() {
    badWarnCounts.clear();
}

module.exports = {
    initAntiBadDB,
    getAntiBadSettings,
    updateAntiBadSettings,
    getAllAntiBadGroups,
    addBadWord,
    removeBadWord,
    getBadWords,
    clearAllBadWords,
    containsBadWord,
    getBadWarnCount,
    incrementBadWarnCount,
    resetBadWarnCount,
    clearAllBadWarns,
    clearAllGroupsBadWarns,
    AntiBadDB,
    BadWordsDB
};
