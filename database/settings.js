const { DataTypes } = require('sequelize');
const {
    database,
    botPrefix,
    botAuthor,
    botUrl,
    botGurl,
    waUsername,
    botTimezone,
    botBotname,
    botPackname,
    botMode,
    botSessionName,
    autosocialdownload,
    autogreytick
} = require('../settings');

const SettingsDB = database.define('settings', {
    prefix: {
        type: DataTypes.STRING,
        defaultValue: botPrefix,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        defaultValue: botAuthor,
        allowNull: false
    },
    url: {
        type: DataTypes.TEXT,
        defaultValue: botUrl,
        allowNull: false
    },
    gurl: {
        type: DataTypes.STRING,
        defaultValue: botGurl,
        allowNull: false
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: botTimezone,
        allowNull: false
    },
    botname: {
        type: DataTypes.STRING,
        defaultValue: botBotname,
        allowNull: false
    },
    packname: {
        type: DataTypes.STRING,
        defaultValue: botPackname,
        allowNull: false
    },
    mode: {
        type: DataTypes.STRING,
        defaultValue: botMode,
        allowNull: false
    },
    waUsername: {
        type: DataTypes.STRING,
        defaultValue: waUsername,
        allowNull: true
    },
    sessionName: {
        type: DataTypes.STRING,
        defaultValue: botSessionName,
        allowNull: false
    },
    autosocialdownload: {
        type: DataTypes.STRING,
        defaultValue: autosocialdownload,
        allowNull: false
    },
    autogreytick: {
        type: DataTypes.BOOLEAN,
        defaultValue: autogreytick,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'bot_settings'
});

async function initSettingsDB() {
    try {
        await SettingsDB.sync({ alter: true });
        console.log('Settings table ready');

        const count = await SettingsDB.count();
        if (count === 0) {
            await SettingsDB.create({
                prefix: botPrefix,
                author: botAuthor,
                url: botUrl,
                gurl: botGurl,
                timezone: botTimezone,
                botname: botBotname,
                packname: botPackname,
                mode: botMode,
                waUsername: waUsername,
                sessionName: botSessionName,
                autosocialdownload: autosocialdownload,
                autogreytick: autogreytick
            });
            console.log('Bot settings defaults initialized from settings');
        }
    } catch (error) {
        console.error('Error initializing Settings table:', error);
        throw error;
    }
}

async function getSettings() {
    try {
        let settings = await SettingsDB.findOne();
        if (!settings) {
            settings = await SettingsDB.create({
                prefix: botPrefix,
                author: botAuthor,
                url: botUrl,
                gurl: botGurl,
                timezone: botTimezone,
                botname: botBotname,
                packname: botPackname,
                mode: botMode,
                waUsername: waUsername,
                sessionName: botSessionName,
                autosocialdownload: autosocialdownload,
                autogreytick: autogreytick
            });
        }
        return settings;
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            prefix: botPrefix,
            author: botAuthor,
            url: botUrl,
            gurl: botGurl,
            timezone: botTimezone,
            botname: botBotname,
            packname: botPackname,
            mode: botMode,
            waUsername: waUsername,
            sessionName: botSessionName,
            autosocialdownload: autosocialdownload,
            autogreytick: autogreytick
        };
    }
}

async function updateSettings(updates) {
    try {
        const settings = await getSettings();
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating settings:', error);
        return null;
    }
}

async function getSetting(key) {
    try {
        const settings = await getSettings();
        return settings[key];
    } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return null;
    }
}

module.exports = {
    initSettingsDB,
    getSettings,
    updateSettings,
    getSetting,
    SettingsDB
};
