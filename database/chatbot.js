const { database } = require('../settings');
const { DataTypes } = require('sequelize');

// Define chatbot conversation table
const ChatbotConversationDB = database.define('chatbot_conversations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    chat_jid: { // Changed from user_jid to track per chat/group
        type: DataTypes.STRING,
        allowNull: false
    },
    user_jid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    ai_response: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    response_type: {
        type: DataTypes.ENUM('text', 'audio', 'image', 'video', 'vision'),
        defaultValue: 'text',
        allowNull: false
    },
    media_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
});

// Define chatbot settings table - NOW PER CHAT/GROUP
const ChatbotSettingsDB = database.define('chatbot_settings', {
    chat_jid: { // New field to identify which chat/group
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    chat_name: { // Store group name or contact name for easy identification
        type: DataTypes.STRING,
        allowNull: true
    },
    chat_type: { // 'private' or 'group'
        type: DataTypes.ENUM('private', 'group'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('on', 'off'),
        defaultValue: 'off',
        allowNull: false
    },
    trigger: {
        type: DataTypes.ENUM('dm', 'all', 'mention'), // 'mention' for groups
        defaultValue: 'dm',
        allowNull: false
    },
    default_response: {
        type: DataTypes.ENUM('text', 'audio'),
        defaultValue: 'text',
        allowNull: false
    },
    voice: {
        type: DataTypes.STRING,
        defaultValue: 'Kimberly',
        allowNull: false
    }
}, {
    timestamps: true
});

// Available voices
const availableVoices = [
    'Kimberly', 'Salli', 'Joey', 'Justin', 'Matthew', 'Ivy', 'Joanna', 'Kendra',
    'Amy', 'Brian', 'Emma', 'Aditi', 'Raveena', 'Nicole', 'Russell'
];

// Initialize both tables
async function initChatbotDB() {
    try {
        await ChatbotConversationDB.sync({ alter: true });
        await ChatbotSettingsDB.sync({ alter: true });
        console.log('Chatbot tables ready');
    } catch (error) {
        console.error('Error initializing Chatbot tables:', error);
        throw error;
    }
}

// ===== CONVERSATION FUNCTIONS =====

// Save conversation to database
async function saveConversation(chatJid, userJid, userMessage, aiResponse, responseType = 'text', mediaUrl = null) {
    try {
        await ChatbotConversationDB.create({
            chat_jid: chatJid,
            user_jid: userJid,
            user_message: userMessage,
            ai_response: aiResponse,
            response_type: responseType,
            media_url: mediaUrl
        });
        return true;
    } catch (error) {
        console.error('Error saving conversation:', error);
        return false;
    }
}

// Get conversation history for a chat
async function getConversationHistory(chatJid, limit = 10) {
    try {
        const history = await ChatbotConversationDB.findAll({
            where: { chat_jid: chatJid },
            order: [['timestamp', 'DESC']],
            limit: limit
        });
        return history.map(conv => ({
            user: conv.user_message,
            ai: conv.ai_response,
            type: conv.response_type,
            media: conv.media_url,
            time: conv.timestamp,
            userJid: conv.user_jid
        }));
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}

// Clear conversation history for a chat
async function clearConversationHistory(chatJid) {
    try {
        const deleted = await ChatbotConversationDB.destroy({
            where: { chat_jid: chatJid }
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error clearing conversation history:', error);
        return false;
    }
}

// Get last conversation for context
async function getLastConversation(chatJid) {
    try {
        const lastConv = await ChatbotConversationDB.findOne({
            where: { chat_jid: chatJid },
            order: [['timestamp', 'DESC']]
        });
        return lastConv ? {
            user: lastConv.user_message,
            ai: lastConv.ai_response,
            type: lastConv.response_type,
            media: lastConv.media_url
        } : null;
    } catch (error) {
        console.error('Error getting last conversation:', error);
        return null;
    }
}

// ===== SETTINGS FUNCTIONS =====

// Get settings for a specific chat/group
async function getChatbotSettings(chatJid, chatName = null, chatType = null) {
    try {
        if (!chatJid) return null;
        
        const [settings, created] = await ChatbotSettingsDB.findOrCreate({
            where: { chat_jid: chatJid },
            defaults: {
                chat_jid: chatJid,
                chat_name: chatName || (chatJid.includes('@g.us') ? 'Unknown Group' : 'Private Chat'),
                chat_type: chatType || (chatJid.includes('@g.us') ? 'group' : 'private'),
                status: 'off',
                trigger: chatJid.includes('@g.us') ? 'mention' : 'dm',
                default_response: 'text',
                voice: 'Kimberly'
            }
        });
        
        // Update chat name if provided and different
        if (chatName && settings.chat_name !== chatName) {
            await settings.update({ chat_name: chatName });
        }
        
        return settings;
    } catch (error) {
        console.error('Error getting chatbot settings:', error);
        return null;
    }
}

// Update settings for a specific chat/group
async function updateChatbotSettings(chatJid, updates) {
    try {
        const settings = await getChatbotSettings(chatJid);
        if (!settings) return null;
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating chatbot settings:', error);
        return null;
    }
}

// Get all active chatbot chats/groups
async function getAllActiveChatbots() {
    try {
        const active = await ChatbotSettingsDB.findAll({
            where: { status: 'on' },
            order: [['updatedAt', 'DESC']]
        });
        return active;
    } catch (error) {
        console.error('Error getting active chatbots:', error);
        return [];
    }
}

// Delete settings for a chat (when bot leaves group)
async function deleteChatbotSettings(chatJid) {
    try {
        const deleted = await ChatbotSettingsDB.destroy({
            where: { chat_jid: chatJid }
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error deleting chatbot settings:', error);
        return false;
    }
}

// Initialize database
initChatbotDB().catch(err => {
    console.error('❌ Failed to initialize Chatbot database:', err);
});

module.exports = {
    // Conversation functions
    saveConversation,
    getConversationHistory,
    clearConversationHistory,
    getLastConversation,
    
    // Settings functions
    getChatbotSettings,
    updateChatbotSettings,
    getAllActiveChatbots,
    deleteChatbotSettings,
    
    // Voices
    availableVoices,
    
    // Initialization
    initChatbotDB,
    
    // Models (for advanced use)
    ChatbotConversationDB,
    ChatbotSettingsDB
};
