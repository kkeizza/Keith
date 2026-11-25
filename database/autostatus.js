const { DataTypes } = require('sequelize');
const { 
  database, 
  autostatusAutoviewStatus, 
  autostatusAutoLikeStatus, 
  autostatusAutoReplyStatus, 
  autostatusStatusReplyText, 
  autostatusStatusLikeEmojis 
} = require('../settings');

const AutoStatusDB = database.define('autostatus', {
  autoviewStatus: {
    type: DataTypes.STRING,
    defaultValue: autostatusAutoviewStatus,
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  autoLikeStatus: {
    type: DataTypes.STRING,
    defaultValue: autostatusAutoLikeStatus,
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  autoReplyStatus: {
    type: DataTypes.STRING,
    defaultValue: autostatusAutoReplyStatus,
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  statusReplyText: {
    type: DataTypes.TEXT,
    defaultValue: autostatusStatusReplyText,
    allowNull: false
  },
  statusLikeEmojis: {
    type: DataTypes.TEXT,
    defaultValue: autostatusStatusLikeEmojis,
    allowNull: false
  }
}, {
  timestamps: true
});

async function initAutoStatusDB() {
  try {
    await AutoStatusDB.sync({ alter: true });
    console.log('AutoStatus table ready');
    
    // Initialize with default values if empty
    const count = await AutoStatusDB.count();
    if (count === 0) {
      await AutoStatusDB.create({
        autoviewStatus: autostatusAutoviewStatus,
        autoLikeStatus: autostatusAutoLikeStatus,
        autoReplyStatus: autostatusAutoReplyStatus,
        statusReplyText: autostatusStatusReplyText,
        statusLikeEmojis: autostatusStatusLikeEmojis
      });
      console.log('AutoStatus defaults initialized from settings');
    }
  } catch (error) {
    console.error('Error initializing AutoStatus table:', error);
    throw error;
  }
}

async function getAutoStatusSettings() {
  try {
    const settings = await AutoStatusDB.findOne();
    if (!settings) {
      return await AutoStatusDB.create({
        autoviewStatus: autostatusAutoviewStatus,
        autoLikeStatus: autostatusAutoLikeStatus,
        autoReplyStatus: autostatusAutoReplyStatus,
        statusReplyText: autostatusStatusReplyText,
        statusLikeEmojis: autostatusStatusLikeEmojis
      });
    }
    return settings;
  } catch (error) {
    console.error('Error getting auto status settings:', error);
    return {
      autoviewStatus: autostatusAutoviewStatus,
      autoLikeStatus: autostatusAutoLikeStatus,
      autoReplyStatus: autostatusAutoReplyStatus,
      statusReplyText: autostatusStatusReplyText,
      statusLikeEmojis: autostatusStatusLikeEmojis
    };
  }
}

async function updateAutoStatusSettings(updates) {
  try {
    const settings = await getAutoStatusSettings();
    return await settings.update(updates);
  } catch (error) {
    console.error('Error updating auto status settings:', error);
    return null;
  }
}

module.exports = {
  initAutoStatusDB,
  getAutoStatusSettings,
  updateAutoStatusSettings,
  AutoStatusDB
};
