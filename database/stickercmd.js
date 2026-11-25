const { DataTypes } = require('sequelize');
const { database } = require('../settings');

const DEFAULT_SESSION = 'main';

const StickerCmdDB = database.define('stickercmd', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    session_id: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: DEFAULT_SESSION
    },
    sticker_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    command: {
        type: DataTypes.STRING,
        allowNull: false
    },
    set_by: {
        type: DataTypes.STRING,
        allowNull: false
    },
    set_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_used: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

const cache = new Map();
let cacheLoaded = false;

function bucket(sessionId) {
    if (!cache.has(sessionId)) cache.set(sessionId, new Map());
    return cache.get(sessionId);
}

function toEntry(row) {
    return {
        hash: row.sticker_hash,
        command: row.command,
        setBy: row.set_by,
        setAt: row.set_at,
        usageCount: row.usage_count || 0,
        lastUsed: row.last_used || null
    };
}

async function loadCache() {
    const rows = await StickerCmdDB.findAll();
    cache.clear();
    for (const row of rows) {
        bucket(row.session_id).set(row.sticker_hash, toEntry(row));
    }
    cacheLoaded = true;
}

async function initStickerCmdDB() {
    try {
        await StickerCmdDB.sync({ alter: true });
        await loadCache();
        console.log('StickerCmd table ready');
    } catch (error) {
        console.error('Error initializing StickerCmd table:', error);
        throw error;
    }
}

function getStickerHash(stickerMsg) {
    try {
        const fileHash = stickerMsg?.fileSha256;
        if (!fileHash) return null;

        let buf;
        if (typeof fileHash === 'string') buf = Buffer.from(fileHash, 'base64');
        else if (Array.isArray(fileHash?.data)) buf = Buffer.from(fileHash.data);
        else buf = Buffer.from(fileHash);

        return buf.length ? buf.toString('hex') : null;
    } catch (error) {
        console.error('Error getting sticker hash:', error);
        return null;
    }
}

async function setStickerCommand(sessionId, stickerHash, command, userId) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        if (!stickerHash || !command) return false;

        const now = new Date();
        const existing = await StickerCmdDB.findOne({
            where: { session_id: sessionId, sticker_hash: stickerHash }
        });

        let row;
        if (existing) {
            row = await existing.update({ command, set_by: userId, set_at: now });
        } else {
            row = await StickerCmdDB.create({
                session_id: sessionId,
                sticker_hash: stickerHash,
                command,
                set_by: userId,
                set_at: now
            });
        }

        bucket(sessionId).set(stickerHash, toEntry(row));
        return true;
    } catch (error) {
        console.error('Error saving sticker command:', error);
        return false;
    }
}

async function getStickerCommand(sessionId, stickerHash) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        if (!stickerHash) return null;

        if (!cacheLoaded) await loadCache();
        return bucket(sessionId).get(stickerHash) || null;
    } catch (error) {
        console.error('Error getting sticker command:', error);
        return null;
    }
}

async function removeStickerCommand(sessionId, stickerHash) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        if (!stickerHash) return false;

        const deleted = await StickerCmdDB.destroy({
            where: { session_id: sessionId, sticker_hash: stickerHash }
        });
        bucket(sessionId).delete(stickerHash);
        return deleted > 0;
    } catch (error) {
        console.error('Error removing sticker command:', error);
        return false;
    }
}

async function removeStickerCommandsByName(sessionId, command) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        if (!command) return 0;

        const target = String(command).trim().toLowerCase();
        const rows = await StickerCmdDB.findAll({ where: { session_id: sessionId } });
        const matches = rows.filter(r => r.command.trim().split(/\s+/)[0].toLowerCase() === target);
        if (!matches.length) return 0;

        await StickerCmdDB.destroy({
            where: { session_id: sessionId, sticker_hash: matches.map(r => r.sticker_hash) }
        });
        for (const r of matches) bucket(sessionId).delete(r.sticker_hash);
        return matches.length;
    } catch (error) {
        console.error('Error removing sticker commands by name:', error);
        return 0;
    }
}

async function getUserStickerCommands(sessionId, userId) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        const rows = await StickerCmdDB.findAll({
            where: { session_id: sessionId, set_by: userId },
            order: [['set_at', 'DESC']]
        });
        return rows.map(toEntry);
    } catch (error) {
        console.error('Error getting user sticker commands:', error);
        return [];
    }
}

async function getAllStickerCommands(sessionId) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        const rows = await StickerCmdDB.findAll({
            where: { session_id: sessionId },
            order: [['usage_count', 'DESC'], ['set_at', 'DESC']]
        });
        return rows.map(toEntry);
    } catch (error) {
        console.error('Error getting all sticker commands:', error);
        return [];
    }
}

async function incrementStickerUsage(sessionId, stickerHash) {
    try {
        sessionId = sessionId || DEFAULT_SESSION;
        const now = new Date();

        await StickerCmdDB.update(
            { usage_count: database.literal('"usage_count" + 1'), last_used: now },
            { where: { session_id: sessionId, sticker_hash: stickerHash } }
        );

        const entry = bucket(sessionId).get(stickerHash);
        if (entry) {
            entry.usageCount += 1;
            entry.lastUsed = now;
        }
    } catch (error) {
        console.error('Error incrementing sticker usage:', error);
    }
}

module.exports = {
    DEFAULT_SESSION,
    initStickerCmdDB,
    getStickerHash,
    setStickerCommand,
    getStickerCommand,
    removeStickerCommand,
    removeStickerCommandsByName,
    getUserStickerCommands,
    getAllStickerCommands,
    incrementStickerUsage,
    StickerCmdDB
};
