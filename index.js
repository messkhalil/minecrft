const mineflayer = require('mineflayer')
const express = require('express')

const app = express()
app.use(express.json())

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

bot.on('spawn', () => {
  console.log("Bot joined the server!")
})

// ================== نظام كشف التعدين المشبوه ==================

const MAX_WALK_SPEED = 6
const MIN_NORMAL_TIME = 1.5
const SUSPICION_THRESHOLD = 3

let suspicionScores = {}
let lastMined = {}

function distance(pos1, pos2) {
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) +
    Math.pow(pos1.y - pos2.y, 2) +
    Math.pow(pos1.z - pos2.z, 2)
  )
}

bot.on('blockUpdate', (oldBlock, newBlock) => {
  if (!oldBlock) return

  const valuableBlocks = [
    "diamond_ore",
    "deepslate_diamond_ore",
    "ancient_debris"
  ]

  if (valuableBlocks.includes(oldBlock.name) && newBlock.name === "air") {

    const players = Object.values(bot.players)
      .filter(p => p.entity)

    if (players.length === 0) return

    const nearest = players.sort((a, b) =>
      a.entity.position.distanceTo(oldBlock.position) -
      b.entity.position.distanceTo(oldBlock.position)
    )[0]

    if (!nearest) return

    const player = nearest.username
    const location = oldBlock.position
    const timestamp = Date.now() / 1000

    if (!suspicionScores[player]) suspicionScores[player] = 0
    if (!lastMined[player]) lastMined[player] = {}

    const last = lastMined[player][oldBlock.name]

    if (last) {
      const timeDiff = timestamp - last.timestamp
      const dist = distance(last.location, location)

      if ((dist / timeDiff) > MAX_WALK_SPEED || timeDiff < MIN_NORMAL_TIME) {
        suspicionScores[player]++
        console.log("Suspicious:", player, suspicionScores[player])
      }
    }

    lastMined[player][oldBlock.name] = {
      location: location,
      timestamp: timestamp
    }

    if (suspicionScores[player] >= SUSPICION_THRESHOLD) {
      bot.chat(`/ban ${player} Abnormal diamond/netherite mining`)
      console.log("BANNED:", player)
    }
  }
})

// إعادة الاتصال
bot.on('end', () => {
  console.log("Bot disconnected, reconnecting...")
  setTimeout(() => {
    process.exit()
  }, 5000)
})

bot.on('error', err => console.log(err))
