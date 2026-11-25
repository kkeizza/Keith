

let commands = [];

const tabCmds = [];

const evt = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach((callback) => callback(data));
        }
    },
};


const randomEmojis = [
    "😊", "😎", "🔥", "⭐", "💫", "✨", "🌟", "💥", "🚀", "🎯",
    "💯", "❤️", "💕", "💖", "💝", "🎉", "🎊", "🏆", "👑", "💎",
    "📌", "📍", "🛎️", "🔔", "🎵", "🎶", "📢", "🔊", "👀", "👁️",
    "🧠", "💡", "🔋", "🔌", "💻", "📱", "⌚", "📷", "🎥", "📹",
    "☀️", "🌙", "⭐", "🌟", "🌈", "☁️", "⚡", "🔥", "💧", "🌊",
    "🎮", "👾", "🕹️", "🎲", "♠️", "♥️", "♦️", "♣️", "🃏", "🀄",
    "🏀", "⚽", "🎾", "🏐", "🎱", "⚾", "🏈", "🎯", "🏹", "⛳",
    "🚗", "🚓", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚀", "✈️", "🛩️",
    "🍎", "🍌", "🍇", "🍓", "🍈", "🍒", "🍑", "🍍", "🥭", "🍉",
    "🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🎂", "🍰", "🍦", "🍩"
];


function getRandomEmoji() {
  
    return randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
}


function keith(obj, functions) {
    let infoComs = obj;

    if (!obj.category) infoComs.category = "General"; 

    
    if (!obj.react) infoComs.react = getRandomEmoji();

    if (!obj.dontAddCommandList) infoComs.dontAddCommandList = false; 
    
    infoComs.function = functions;

    const stack = new Error().stack;
   
    const filePath = stack.split('\n')[2].match(/\((.*):\d+:\d+\)/)[1];
   
    infoComs.filename = filePath;

    commands.push(infoComs);
    return infoComs;
}

module.exports = { keith, commands, evt, getRandomEmoji };

evt.commands = commands;
