const mineflayer = require('mineflayer')
const express = require('express')

const app = express()
app.use(express.json())

// مهم لـ Render
app.listen(process.env.PORT || 3000)

// صفحة الكونصول
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

// استقبال الرسالة من الصفحة
app.post('/send', (req, res) => {
  const message = req.body.message
  if (message && bot) {
    bot.chat(message)
  }
  res.sendStatus(200)
})

// البوت
const bot = mineflayer.createBot({
  host: '34.75.227.210',
  username: 'AntiCheatBot'
})

bot.on('spawn', () => {
  console.log("Bot joined the server!")
})

bot.on('error', err => console.log(err))
bot.on('end', () => {
  console.log("Bot disconnected...")
})
