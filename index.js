const mineflayer = require('mineflayer')
const express = require('express')

const app = express()
app.use(express.json())

app.listen(process.env.PORT || 3000)

// ================== صفحة الكونصول ==================
let chatMessages = [] // تخزين الرسائل + التنبيهات
let pendingBans = {} // اللاعبين المشتبه بهم والذين ينتظرون قبول الأدمن

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Minecraft Bot Console</title>
    <style>
      body { background:#111; color:#0f0; font-family:monospace; text-align:center; }
      #chat { width:80%; height:500px; background:black; margin:20px auto; padding:10px; overflow:auto; border:1px solid #0f0;}
      input { width:60%; padding:10px; background:black; color:#0f0; border:1px solid #0f0;}
      button { padding:10px; background:#0f0; border:none; cursor:pointer;}
      .alert { color: #f00; } /* رسائل التحذير باللون الأحمر */
    </style>
  </head>
  <body>
    <h2>🟢 Minecraft Bot Console</h2>
    <div id="chat"></div>
    <input id="msg" placeholder="اكتب رسالة..." />
    <button onclick="sendMsg()">Send</button>

    <script>
      async function sendMsg(){
        const msg = document.getElementById('msg').value
        if(!msg) return;
        await fetch('/send', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({message: msg})
        })
        document.getElementById('msg').value = ""
      }

      async function fetchChat(){
        const res = await fetch('/chat')
        const data = await res.json()
        const container = document.getElementById('chat')
        container.innerHTML = ''
        data.forEach(msg => {
          container.innerHTML += "<div class='" + (msg.alert ? "alert":"") + "'>» " + msg.text + "</div>"
        })
        container.scrollTop = container.scrollHeight
      }

      setInterval(fetchChat, 1000)
    </script>
  </body>
  </html>
  `)
})

app.get('/chat', (req,res) => {
  res.json(chatMessages)
})

app.post('/send', (req, res) => {
  const message = req.body.message
  if (message && bot) {
    bot.chat(message)
    chatMessages.push({ text: message, alert: false })
    if(chatMessages.length > 100) chatMessages.shift()
  }
  res.sendStatus(200)
})

// ================== البوت ==================
const bot = mineflayer.createBot({
  host: '34.75.227.210',
  username: 'AntiCheatBot'
})

bot.on('spawn', () => console.log("Bot joined the server!"))

bot.on('chat', (username, message) => {
  chatMessages.push({ text: `${username}: ${message}`, alert: false })
  if(chatMessages.length > 100) chatMessages.shift()

  // تحقق إذا الأدمن كتب /accept
  if (message.toLowerCase() === '+accept') {
    Object.keys(pendingBans).forEach(player => {
      bot.chat(`/ban ${player} Abnormal diamond/netherite mining`)
      const banText = `BANNED: ${player} (approved by ${username})`
      console.log(banText)
      chatMessages.push({ text: banText, alert: true })
    })
    pendingBans = {} // تفريغ قائمة الانتظار بعد البان
  }
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
        const alertText = `⚠ Suspicious mining detected: ${player} score ${suspicionScores[player]}`
        console.log(alertText)
        chatMessages.push({ text: alertText, alert: true })

        // أضف اللاعب لقائمة الانتظار بدلاً من البان مباشرة
        if (suspicionScores[player] >= SUSPICION_THRESHOLD) {
          pendingBans[player] = true
          const pendingText = `⏳ Pending ban: ${player} (waiting for /accept from admin)`
          console.log(pendingText)
          chatMessages.push({ text: pendingText, alert: true })
        }

        if(chatMessages.length > 100) chatMessages.shift()
      }
    }

    lastMined[player][oldBlock.name] = {
      location: location,
      timestamp: timestamp
    }
  }
})

// ================== إعادة الاتصال ==================
bot.on('end', () => {
  console.log("Bot disconnected, reconnecting...")
  setTimeout(() => {
    process.exit()
  }, 5000)
})

bot.on('error', err => console.log(err))

