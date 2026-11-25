const { DataTypes, Op } = require('sequelize');
const { database } = require('../settings');

const ActiveUsersDB = database.define('activeusers', {
    groupJid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userJid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    messageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    lastSeen: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: true,
    indexes: [{ unique: true, fields: ['groupJid', 'userJid'] }]
});

async function initActiveUsersDB() {
    await ActiveUsersDB.sync({ alter: true });
    console.log('Active users table ready');
}

async function recordActiveUser(groupJid, userJid, userName = null) {
    if (!groupJid || !userJid) return null;

    const [entry, created] = await ActiveUsersDB.findOrCreate({
        where: { groupJid, userJid },
        defaults: {
            groupJid,
            userJid,
            userName,
            messageCount: 1,
            lastSeen: new Date()
        }
    });

    if (!created) {
        await entry.update({
            userName: userName || entry.userName,
            messageCount: (entry.messageCount || 0) + 1,
            lastSeen: new Date()
        });
    }

    return entry;
}

async function getActiveUsers(groupJid, limit = 50) {
    return ActiveUsersDB.findAll({
        where: { groupJid },
        order: [['messageCount', 'DESC'], ['lastSeen', 'DESC']],
        limit: Math.max(1, Math.min(Number(limit) || 50, 500))
    });
}

async function getInactiveUsers(groupJid, inactiveMinutes = 30, limit = 500) {
    const cutoff = new Date(Date.now() - Math.max(1, Number(inactiveMinutes) || 30) * 60 * 1000);
    return ActiveUsersDB.findAll({
        where: {
            groupJid,
            lastSeen: { [Op.lt]: cutoff }
        },
        order: [['lastSeen', 'ASC']],
        limit: Math.max(1, Math.min(Number(limit) || 500, 500))
    });
}

async function clearActiveUser(groupJid, userJid) {
    return ActiveUsersDB.destroy({ where: { groupJid, userJid } });
}

async function clearGroupActiveUsers(groupJid) {
    return ActiveUsersDB.destroy({ where: { groupJid } });
}

module.exports = {
    ActiveUsersDB,
    initActiveUsersDB,
    recordActiveUser,
    getActiveUsers,
    getInactiveUsers,
    clearActiveUser,
    clearGroupActiveUsers
};
