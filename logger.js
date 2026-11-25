const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ColorGradient {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
            
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static gradient(text, colors, intensity = 1.0) {
        if (!text) return '';
        
        const segments = [];
        const colorPositions = [];
        const totalColors = colors.length;
        
        for (let i = 0; i < totalColors; i++) {
            colorPositions.push(i / (totalColors - 1));
        }

        for (let i = 0; i < text.length; i++) {
            const pos = i / text.length;
            let startIdx = 0;
            let endIdx = 1;
            
            for (let j = 0; j < colorPositions.length - 1; j++) {
                if (pos >= colorPositions[j] && pos <= colorPositions[j + 1]) {
                    startIdx = j;
                    endIdx = j + 1;
                    break;
                }
            }

            const t = (pos - colorPositions[startIdx]) / (colorPositions[endIdx] - colorPositions[startIdx]);
            const startColor = this.hexToRgb(colors[startIdx]);
            const endColor = this.hexToRgb(colors[endIdx]);

            let r = this.lerp(startColor.r, endColor.r, t);
            let g = this.lerp(startColor.g, endColor.g, t);
            let b = this.lerp(startColor.b, endColor.b, t);

            r = 255 - (255 - r) * (1 / intensity);
            g = 255 - (255 - g) * (1 / intensity);
            b = 255 - (255 - b) * (1 / intensity);

            const hex = this.rgbToHex(r, g, b);
            segments.push(chalk.hex(hex)(text[i]));
        }

        return segments.join('');
    }

    static shimmer(text, colors, shimmerPos = 0.5) {
        const shimmered = [];
        
        for (let i = 0; i < text.length; i++) {
            const pos = i / text.length;
            const distance = Math.abs(pos - shimmerPos);
            const brightness = Math.max(0, 1 - distance * 2);
            const colorIdx = Math.min(colors.length - 1, Math.floor(pos * (colors.length - 1)));
            const color = this.hexToRgb(colors[colorIdx]);
            
            const r = Math.min(255, color.r + brightness * 100);
            const g = Math.min(255, color.g + brightness * 100);
            const b = Math.min(255, color.b + brightness * 100);
            
            shimmered.push(chalk.hex(this.rgbToHex(r, g, b))(text[i]));
        }
        
        return shimmered.join('');
    }
}

const gradients = {
    royal: ['#FFD700', '#FF6B6B', '#FF0080', '#7B2FBE', '#00B4DB', '#FFD700'],
    crystal: ['#E0EAFC', '#CFDEF3', '#A8C0FF', '#8BB0FF', '#6B9FFF', '#4D8BFF'],
    nebula: ['#FF0080', '#FF8C00', '#FFD700', '#00FF87', '#00D4FF', '#7B2FBE', '#FF0080'],
    aurora: ['#00F260', '#0575E6', '#7F00FF', '#FF0080', '#FF6B6B', '#FECA57'],
    celestial: ['#FFD700', '#FF6B6B', '#FF9FF3', '#A29BFE', '#74B9FF', '#55EFC4'],
    ember: ['#FF416C', '#FF4B2B', '#FF9F43', '#FECA57', '#FFD93D'],
    pearl: ['#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D'],
    diamond: ['#E0EAFC', '#CFDEF3', '#A8C0FF', '#8BB0FF', '#6B9FFF', '#4D8BFF', '#E0EAFC'],
    midnight: ['#2C3E50', '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6'],
    rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    sunset: ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3'],
    neon: ['#FF0080', '#FF8C00', '#40E0D0', '#7B2FBE'],
    ocean: ['#00B4DB', '#0083B0', '#00BCD4', '#4DD0E1'],
    fire: ['#FF6B6B', '#FF9F43', '#FECA57', '#FF4757'],
    galaxy: ['#7B2FBE', '#A855F7', '#EC4899', '#F472B6'],
    forest: ['#2ECC71', '#27AE60', '#1ABC9C', '#16A085'],
    gold: ['#FFD700', '#FFA500', '#FF8C00', '#FFD700'],
    candy: ['#FF6B6B', '#FF9FF3', '#F368E0', '#FF6B6B'],
    ice: ['#74B9FF', '#81ECEC', '#00CEC9', '#0984E3']
};

const borders = {
    royal: {
        topLeft: '👑', 
        topRight: '👑', 
        bottomLeft: '👑', 
        bottomRight: '👑',
        horizontal: '═', 
        vertical: '║', 
        titleLeft: '╠', 
        titleRight: '╣'
    },
    diamond: {
        topLeft: '◆', 
        topRight: '◆', 
        bottomLeft: '◆', 
        bottomRight: '◆',
        horizontal: '━', 
        vertical: '┃', 
        titleLeft: '┣', 
        titleRight: '┫'
    },
    star: {
        topLeft: '✦', 
        topRight: '✦', 
        bottomLeft: '✦', 
        bottomRight: '✦',
        horizontal: '─', 
        vertical: '│', 
        titleLeft: '├', 
        titleRight: '┤'
    },
    elegant: {
        topLeft: '╔', 
        topRight: '╗', 
        bottomLeft: '╚', 
        bottomRight: '╝',
        horizontal: '═', 
        vertical: '║', 
        titleLeft: '╠', 
        titleRight: '╣'
    },
    soft: {
        topLeft: '╭', 
        topRight: '╮', 
        bottomLeft: '╰', 
        bottomRight: '╯',
        horizontal: '─', 
        vertical: '│', 
        titleLeft: '├', 
        titleRight: '┤'
    },
    mystic: {
        topLeft: '❖', 
        topRight: '❖', 
        bottomLeft: '❖', 
        bottomRight: '❖',
        horizontal: '━', 
        vertical: '┃', 
        titleLeft: '┣', 
        titleRight: '┫'
    },
    glow: {
        topLeft: '✧', 
        topRight: '✧', 
        bottomLeft: '✧', 
        bottomRight: '✧',
        horizontal: '━', 
        vertical: '│', 
        titleLeft: '├', 
        titleRight: '┤'
    }
};

const logsDir = path.join(__dirname, 'logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

class KeithLogger {
    static setClientInstance(clientInstance) {
        this.client = clientInstance;
    }

    static createGradientBox(lines, gradientName = 'sunset', borderStyle = 'royal', shimmer = false) {
        const gradientColors = gradients[gradientName] || gradients.sunset;
        const border = borders[borderStyle] || borders.royal;
        
        const maxWidth = Math.max(...lines.map(line => line.length)) + 6;
        
        const topBorder = border.topLeft + border.horizontal.repeat(maxWidth) + border.topRight;
        
        if (shimmer) {
            console.log(ColorGradient.shimmer(topBorder, gradientColors, 0.3));
        } else {
            console.log(ColorGradient.gradient(topBorder, gradientColors, 1.2));
        }
        
        lines.forEach((line, index) => {
            const padding = maxWidth - line.length - 1;
            const leftPad = ' '.repeat(Math.floor(padding / 2));
            const rightPad = ' '.repeat(Math.ceil(padding / 2));
            const contentLine = border.vertical + leftPad + line + rightPad + border.vertical;
            const colorIndex = Math.min(gradientColors.length - 1, Math.floor((index / lines.length) * (gradientColors.length - 1)));
            
            if (line.includes('✦') || line.includes('━') || line.includes('═')) {
                console.log(ColorGradient.shimmer(contentLine, gradientColors, 0.5));
            } else {
                console.log(chalk.hex(gradientColors[Math.min(colorIndex, gradientColors.length - 1)])(contentLine));
            }
        });
        
        const bottomBorder = border.bottomLeft + border.horizontal.repeat(maxWidth) + border.bottomRight;
        
        if (shimmer) {
            console.log(ColorGradient.shimmer(bottomBorder, [...gradientColors].reverse(), 0.7));
        } else {
            console.log(ColorGradient.gradient(bottomBorder, [...gradientColors].reverse(), 1.2));
        }
    }

    static createSeparator(gradientName = 'royal', symbol = '✦') {
        const colors = gradients[gradientName] || gradients.royal;
        const separator = symbol.repeat(50);
        
        console.log(ColorGradient.shimmer(separator, colors, 0.5));
    }

    static async logMessage(m) {
        try {
            if (!this.client) {
                this.warning('KeithLogger: Client instance not set yet');
                return;
            }

            const isGroup = m.isGroup;
            const isBroadcast = m.isBroadcast || false;
            const remoteJid = m.remoteJid || '';
            const senderName = m.pushName || m.senderName || 'Unknown User';
            const senderId = m.sender || 'Unknown ID';
            const messageType = m.mtype || 'Unknown Type';
            const text = m.text || '';

            let groupName = 'Unknown Group';
            let groupId = '';
            
            if (isGroup && remoteJid) {
                try {
                    const groupMetadata = await this.client.groupMetadata(remoteJid).catch(() => null);
                    
                    if (groupMetadata?.subject) {
                        groupName = groupMetadata.subject;
                    }
                    
                    groupId = remoteJid.split('@')[0];
                } catch (e) {
                    groupName = 'Group Chat';
                    groupId = remoteJid.split('@')[0];
                }
            }

            let phoneNumber = 'Unknown';
            let lidInfo = '';
            let jidInfo = '';
            
            if (senderId && senderId.includes('@')) {
                const baseId = senderId.split('@')[0];
                
                if (senderId.endsWith('@lid')) {
                    phoneNumber = baseId;
                    lidInfo = `LID: ${baseId}`;
                    
                    if (isGroup && remoteJid) {
                        try {
                            const groupMetadata = await this.client.groupMetadata(remoteJid).catch(() => null);
                            
                            if (groupMetadata?.participants) {
                                const participant = groupMetadata.participants.find(p => 
                                    p.id === senderId || p.lid === senderId || p.pn === senderId
                                );
                                
                                if (participant?.pn) {
                                    jidInfo = `JID: ${participant.pn.split('@')[0]}`;
                                }
                            }
                        } catch (e) {}
                    }
                } else {
                    phoneNumber = baseId;
                    jidInfo = `JID: ${baseId}`;
                    
                    if (isGroup && remoteJid) {
                        try {
                            const groupMetadata = await this.client.groupMetadata(remoteJid).catch(() => null);
                            
                            if (groupMetadata?.participants) {
                                const participant = groupMetadata.participants.find(p => 
                                    p.pn === senderId || p.id === senderId
                                );
                                
                                if (participant?.id && participant.id.endsWith('@lid')) {
                                    lidInfo = `LID: ${participant.id.split('@')[0]}`;
                                } else if (participant?.lid) {
                                    lidInfo = `LID: ${participant.lid.split('@')[0]}`;
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            console.log('');
            console.log(ColorGradient.gradient('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', gradients.royal, 1.5));
            console.log(ColorGradient.shimmer('♛  K E I T H - M D  ♛', gradients.royal, 0.5));
            console.log(ColorGradient.gradient('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', gradients.royal, 1.5));

            const badgeColors = isBroadcast ? gradients.royal : gradients.crystal;
            const badgeText = isBroadcast ? `📢  B R O A D C A S T` : `💬  N E W  M E S S A G E`;
            
            console.log('');
            console.log(ColorGradient.shimmer(`┌── ${badgeText} ──┐`, badgeColors, 0.6));

            const senderLines = [];
            
            if (isBroadcast) {
                senderLines.push(`📡  From: ${senderName}`);
            } else if (isGroup) {
                senderLines.push(`👥  Group: ${groupName}`);
                senderLines.push(`🆔  Group ID: ${groupId}`);
                senderLines.push(`👤  Sender: ${senderName}`);
                
                if (lidInfo || jidInfo) {
                    senderLines.push(`🔑  ${lidInfo || jidInfo}`);
                    
                    if (lidInfo && jidInfo) {
                        senderLines.push(`🔐  ${jidInfo}`);
                    }
                } else {
                    senderLines.push(`📱  Phone: ${phoneNumber}`);
                }
            } else {
                senderLines.push(`👤  Private Chat: ${senderName}`);
                senderLines.push(`📱  Phone: ${phoneNumber}`);
            }

            this.createGradientBox(senderLines, 'crystal', 'soft', true);

            if (text && text.trim() !== '') {
                console.log('');
                
                const contentLines = [
                    `📋  Type: ${messageType}`,
                    `────────────────────`,
                    `📝  ${text}`
                ];
                
                if (text.length > 80) {
                    const words = text.split(' ');
                    let line = '';
                    const wrappedLines = [];
                    
                    words.forEach(word => {
                        if ((line + word).length > 70) {
                            wrappedLines.push(line);
                            line = word + ' ';
                        } else {
                            line += word + ' ';
                        }
                    });
                    
                    if (line.trim()) {
                        wrappedLines.push(line.trim());
                    }
                    
                    contentLines.length = 0;
                    contentLines.push(`📋  Type: ${messageType}`);
                    contentLines.push(`────────────────────`);
                    wrappedLines.forEach(line => contentLines.push(`📝  ${line}`));
                }
                
                this.createGradientBox(contentLines, 'nebula', 'mystic', true);
            }

            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(logsDir, `messages_${today}.log`);
            
            let logEntry = `[${new Date().toISOString()}] `;
            
            if (isBroadcast) {
                logEntry += `BROADCAST | Sender: ${senderName} (${phoneNumber}) | `;
            } else if (isGroup) {
                let idInfo = '';
                
                if (lidInfo && jidInfo) {
                    idInfo = ` | ${lidInfo}, ${jidInfo}`;
                } else if (lidInfo) {
                    idInfo = ` | ${lidInfo}`;
                } else if (jidInfo) {
                    idInfo = ` | ${jidInfo}`;
                } else {
                    idInfo = ` | ID: ${phoneNumber}`;
                }
                
                logEntry += `GROUP: ${groupName} (${groupId}) | Sender: ${senderName}${idInfo} | `;
            } else {
                logEntry += `PRIVATE | Sender: ${senderName} (${phoneNumber}) | `;
            }
            
            logEntry += `Type: ${messageType} | Content: ${text}\n`;
            
            fs.appendFileSync(logFile, logEntry);
            
            console.log('');
            console.log(ColorGradient.shimmer('✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦', gradients.royal, 0.7));
            console.log('');

        } catch (error) {
            this.error('Error in logMessage', error);
        }
    }

    static error(message, error) {
        const errorLines = [
            `⚠️  E R R O R  O C C U R R E D`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `${message}`,
            `${error ? error.message : ''}`
        ];
        
        this.createGradientBox(errorLines, 'fire', 'diamond', true);
        
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `errors_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [ERROR] ${message}\n${error ? (error.stack || error.message) : ''}\n`;
        
        fs.appendFileSync(logFile, logEntry);
    }

    static success(message) {
        const successLines = [
            `✅  S U C C E S S`,
            `━━━━━━━━━━━━━━━`,
            `${message}`
        ];
        
        this.createGradientBox(successLines, 'forest', 'soft', true);
        
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `success_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [SUCCESS] ${message}\n`;
        
        fs.appendFileSync(logFile, logEntry);
    }

    static warning(message) {
        const warningLines = [
            `⚠️  W A R N I N G`,
            `━━━━━━━━━━━━━━━`,
            `${message}`
        ];
        
        this.createGradientBox(warningLines, 'gold', 'elegant', true);
        
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `warnings_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [WARNING] ${message}\n`;
        
        fs.appendFileSync(logFile, logEntry);
    }

    static info(message) {
        const infoLines = [
            `ℹ️  I N F O`,
            `━━━━━━━━━━`,
            `${message}`
        ];
        
        this.createGradientBox(infoLines, 'ocean', 'glow', true);
        
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `info_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [INFO] ${message}\n`;
        
        fs.appendFileSync(logFile, logEntry);
    }
}

module.exports = KeithLogger;
