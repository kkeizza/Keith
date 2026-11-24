<h1 align="center">KEITH-MD</h1> 

<div align="center">
  <a href="https://apiskeith.top">
    <img src="https://i.ibb.co/PsZnb9NH/0d81ac6b1fb1.jpg" alt="01" border="0" />
  </a>
  <hr style="margin-top: 20px; margin-bottom: 20px;"/>
</div> 

| <div align="center"><b>FORK</b><br><br>Fork the repository to customize and use the bot for your needs.<br><br><a href="https://github.com/kkeizza/Keith/fork"><img src="https://img.shields.io/badge/FORK-this%20repo-purple" alt="FORK ALPHA" width="150"></a></div> | <div align="center"><b>SESSION</b><br><br>Link your session ID to start using the bot. Follow steps if issues arise.<br><br><a href="https://keithsite.lol/keithpair"><img src="https://img.shields.io/badge/Pair%20session%20code-white" alt="Pair session code" width="300"></a></div> |
| :--- | :--- |
| <div align="center"><b>DOWNLOAD ZIP</b><br><br>Download latest Keith md zip.<br><br><a href="https://github.com/kkeizza/Keith/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/Download-ZIP-blue" alt="Download zip" width="200"></a></div> | <div align="center"><b>DEPLOY</b><br><br>Deploy the bot to your server or platform of choice using the button below.<br><br><a href="https://keithsite.lol/heroku"><img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku"></a></div> |

<br>

<div align="center">
  <b>KEITH HOSTING</b><br><br>
  Host your bot on Keith's official hosting platform.<br><br>
  <a href="https://hosting.keithsite.lol">
    <img src="https://img.shields.io/badge/Host%20Now-hosting.keithsite.lol-brightgreen" alt="Keith Hosting" width="300">
  </a>
</div>

---

## Keith-MD Architecture & Data Flow

```mermaid
flowchart TD
    A["WhatsApp WebSocket\nMessaging connection layer"] --> B["Session loader\nSession code\nDatabase lookup"]
    B --> C["Baileys event bus"]

    C --> C1["messages.upsert"]
    C --> C2["connection.update"]
    C --> C3["call"]
    C --> C4["group events"]
    C --> C5["lid-mapping.update"]

    C1 --> D["Message normalizer\ntext, captions, media type\nchat JID and sender"]
    D --> E["Identity resolver\nphone JID, LID, alternate JID\nusername, quoted user, mentions"]
    E --> F["Context builder\nDM/group, group metadata\nadmins, superusers, bot admin"]

    F --> G{"Guards and routing"}

    G -->|Blocked or warned| H["Moderation\ndelete, warn, kick, notify"]
    G -->|Command| I["Prefix and argument parser"]
    G -->|Normal message| J["Automatic feature handlers"]
    G -->|Chatbot trigger| K["Text-only Keith chatbot"]

    I --> L["commandHandler.js\nCmds/*.js plugin dispatcher"]
    L --> M["Command execution\nowner, sudo, admin, group checks"]

    J --> N["Auto features\nread, presence, react, greet\nautobio, status, active users"]

    K --> O["Chatbot history\nconversation context"]
    O --> P["External API\ntext response service"]
    P --> Q["Text response\noptional safe group mention\nsave conversation"]

    M --> R["Feature databases\nsettings and conversation data"]
    N --> R
    Q --> R
    M --> S["External APIs and media tools\ndownloads, stickers\naudio, video, image utilities"]

    H --> T["Outgoing message builder"]
    M --> T
    N --> T
    Q --> T
    C2 --> T
    C3 --> T
    C4 --> T

    T --> U["Encrypted message delivery\nreplies, presence, reactions\nand group actions"]
    U --> A
