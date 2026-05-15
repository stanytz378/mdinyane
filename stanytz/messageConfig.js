// Channel/Newsletter Configuration for forwarded messages
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363404317544295@newsletter',  // Badilisha hii na ID yako
            newsletterName: 'ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ',
            serverMessageId: -1
        }
    }
};

// Bot image path
const botImagePath = './stanytz/bot_image.png';

// Function to get message with channel forwarding
const getForwardedMessage = (text, additionalContext = {}) => {
    return {
        text: text,
        contextInfo: {
            ...channelInfo.contextInfo,
            ...additionalContext
        }
    };
};

export { channelInfo, botImagePath, getForwardedMessage };
