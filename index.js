const mineflayer = require('mineflayer')
const express = require('express')

const app = express()
app.use(express.json())

// مهم لـ Render
app.listen(process.env.PORT || 3000)

// ================== صفحة الكونصول ==================
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Minecraft Bot Console</title>
    <style>
      body { background:#111; color:#0f0; font-family:monospace; text-align:center; }
      #chat { width:80%; height:300px; background:black; margin:20px auto; padding:10px; overflow:auto; border:1px solid #0f0;}
      input { width:60%; padding:10px; background:black; color:#0f0; border:1px solid #0f0;}
      button { padding:10px; background:#0f0; border:none; cursor:pointer;}
    </style>
  </head>
  <body>
    <h2>🟢 Minecraft Bot Console</h2>
    <div id="chat"></div>
    <input id="msg" placeholder="اكتب رسالة..." />
    <button onclick="sendMsg()">Send</button>

    <script>
      function sendMsg(){
        const msg = document.getElementById('msg').value
        fetch('/send', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({message: msg})
        })
        document.getElementById('chat').innerHTML += "<div>> " + msg + "</div>"
        document.getElementById('msg').value = ""
      }
    </script>
  </body>
  </html>
  `)
})

// إرسال رسالة من الموقع إلى ماينكرافت
app.post('/send', (req, res) => {
  const message = req.body.message
  if (message && bot) {
    bot.chat(message)
  }
  res.sendStatus(200)
})

// ================== البوت ==================
const bot = mineflayer.createBot({
  host: '34.75.227.210',
  username: 'AntiCheatBot'
})

let playerLogs = {}

bot.on('spawn', () => {
  console.log("Bot joined the server!")
})

// ================== نظام مراقبة الدايموند ==================
bot.on('playerCollect', (collector, collected) => {
  if (!collector || !collector.username) return

  const player = collector.username
  const itemName = collected?.item?.name

  if (!playerLogs[player]) {
    playerLogs[player] = {
      diamonds: 0,
      debris: 0,
      time: Date.now()
    }
  }

  const now = Date.now()
  const diff = (now - playerLogs[player].time) / 1000

  // مراقبة Diamond
  if (itemName === "diamond") {
    playerLogs[player].diamonds++
  }

  // مراقبة Ancient Debris
  if (itemName === "ancient_debris") {
    playerLogs[player].debris++
  }

  // بان إذا جمع 10 دايموند خلال 60 ثانية
  if (playerLogs[player].diamonds >= 10 && diff < 60) {
    bot.chat(`/ban ${player} Fast diamond farming detected`)
    console.log("Banned for diamonds:", player)
  }

  // بان إذا جمع 5 نذرايت خلال 60 ثانية
  if (playerLogs[player].debris >= 5 && diff < 60) {
    bot.chat(`/ban ${player} Fast netherite farming detected`)
    console.log("Banned for netherite:", player)
  }
})

// إعادة الاتصال إذا فصل
bot.on('end', () => {
  console.log("Bot disconnected, reconnecting...")
  setTimeout(() => {
    process.exit()
  }, 5000)
})

bot.on('error', err => console.log(err))
