const { database } = require('../settings');
const { DataTypes, Op } = require('sequelize');

const SudoDB = database.define('sudo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    jid: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    // NEW: WhatsApp username (e.g. "veske_rs"), stored WITHOUT the leading "@".
    // Optional - a sudo entry can exist with just a jid, just as before.
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: false,
});

async function initSudoDB() {
    try {
        await SudoDB.sync({ alter: true });
        console.log('Sudo table ready');
    } catch (error) {
        console.error('Error initializing sudo table:', error);
        throw error;
    }
}

// Normalizes a username: strips a leading "@" and lowercases it.
function normalizeUsername(username) {
    if (!username) return null;
    return username.toString().trim().replace(/^@/, '').toLowerCase();
}

function normalizeJid(jid) {
    if (!jid) return null;
    const value = jid.toString().trim().toLowerCase();
    if (!value) return null;
    if (/^\d+$/.test(value)) return value;
    if (/^\d+(?::\d+)?@(s\.whatsapp\.net|c\.us|lid)$/.test(value)) {
        return value.replace('@c.us', '@s.whatsapp.net');
    }
    return null;
}

function getSudoNumbers() {
    return getAllSudoNumbers();
}

// setSudo(jid, username?) - username is optional, kept for backwards compatibility
function setSudo(jid, username) {
    return addSudoNumber(jid, username);
}

// delSudo(identifier) - identifier can be a jid/number OR a username
function delSudo(identifier) {
    return removeSudoNumber(identifier);
}

// Database functions
// isSudo(identifier) - checks username first (if it looks like one / matches a record),
// then falls back to jid, exactly like before.
async function isSudo(identifier) {
    try {
        if (!identifier) return false;

        const value = identifier.toString().trim();
        const cleanJid = normalizeJid(value);
        const cleanUsername = cleanJid ? null : normalizeUsername(value);
        const conditions = [];

        if (cleanUsername) conditions.push({ username: cleanUsername });
        if (cleanJid) {
            conditions.push({ jid: cleanJid });
            if (cleanJid.includes('@')) conditions.push({ jid: cleanJid.split('@')[0] });
        }

        if (!conditions.length) return false;

        const count = await SudoDB.count({
            where: { [Op.or]: conditions }
        });
        return count > 0;
    } catch (error) {
        console.error('Error checking sudo status:', error);
        return false;
    }
}

// addSudoNumber(jid, username?)
// - jid: required, phone number / jid part before "@"
// - username: optional WhatsApp username (with or without leading "@")
async function addSudoNumber(jid, username) {
    try {
        const cleanJid = normalizeJid(jid);
        const cleanUsername = normalizeUsername(username);
        if (!cleanJid && !cleanUsername) return false;

        const identityConditions = [];
        if (cleanJid) {
            identityConditions.push({ jid: cleanJid });
            if (cleanJid.includes('@')) identityConditions.push({ jid: cleanJid.split('@')[0] });
        }
        if (cleanUsername) identityConditions.push({ username: cleanUsername });

        // Already sudo by jid or by username? Don't duplicate.
        const existing = await SudoDB.findOne({
            where: { [Op.or]: identityConditions }
        });

        if (existing) {
            let changed = false;
            if (cleanUsername && !existing.username) {
                existing.username = cleanUsername;
                changed = true;
            }
            if (cleanJid && !existing.jid) {
                existing.jid = cleanJid;
                changed = true;
            }
            if (changed) {
                await existing.save();
                console.log(`ℹ️ Updated sudo entry ${cleanJid || '(username-only)'}`);
            } else {
                console.log(`ℹ️ Sudo entry already exists: ${cleanJid || `@${cleanUsername}`}`);
            }
            return false; // already existed
        }

        await SudoDB.create({ jid: cleanJid, username: cleanUsername });
        console.log(`✅ Added sudo entry: ${cleanJid || `@${cleanUsername}`}`);
        return true;
    } catch (error) {
        console.error('❌ Error adding sudo number:', error);
        return false;
    }
}

// removeSudoNumber(identifier) - identifier can be a jid/number OR a username
async function removeSudoNumber(identifier) {
    try {
        if (!identifier) return false;

        const value = identifier.toString().trim();
        const cleanJid = normalizeJid(value);
        const cleanUsername = cleanJid ? null : normalizeUsername(value);
        const conditions = [];
        if (cleanUsername) conditions.push({ username: cleanUsername });
        if (cleanJid) {
            conditions.push({ jid: cleanJid });
            if (cleanJid.includes('@')) conditions.push({ jid: cleanJid.split('@')[0] });
        }
        if (!conditions.length) return false;

        const deleted = await SudoDB.destroy({
            where: { [Op.or]: conditions }
        });

        if (deleted) {
            console.log(`✅ Removed sudo entry: ${identifier}`);
            return true;
        } else {
            console.log(`ℹ️ Sudo entry not found: ${identifier}`);
            return false; // not found
        }
    } catch (error) {
        console.error('❌ Error removing sudo number:', error);
        return false;
    }
}

async function getAllSudoNumbers() {
    try {
        const results = await SudoDB.findAll({
            attributes: ['jid'],
            raw: true
        });
        return results.map(item => item.jid).filter(Boolean);
    } catch (error) {
        console.error('❌ Error getting sudo numbers:', error);
        return [];
    }
}

// NEW: returns all sudo usernames (without "@"), skipping empty ones.
async function getAllSudoUsernames() {
    try {
        const results = await SudoDB.findAll({
            attributes: ['username'],
            where: { username: { [Op.ne]: null } },
            raw: true
        });
        return results.map(item => item.username).filter(Boolean);
    } catch (error) {
        console.error('❌ Error getting sudo usernames:', error);
        return [];
    }
}

async function isSudoTableNotEmpty() {
    try {
        const count = await SudoDB.count();
        return count > 0;
    } catch (error) {
        console.error('❌ Error checking sudo table:', error);
        return false;
    }
}


initSudoDB().catch(err => {
    console.error('❌ Failed to initialize sudo database:', err);
});


module.exports = {
    getSudoNumbers,
    setSudo,
    delSudo,
    isSudo,
    addSudoNumber,
    removeSudoNumber,
    getAllSudoNumbers,
    getAllSudoUsernames,
    isSudoTableNotEmpty,
    initSudoDB,
    normalizeUsername,
    SudoDB
};
