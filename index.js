const mineflayer = require('mineflayer')
const express = require('express')

const app = express()
app.get('/', (req, res) => {
  res.send("Bot is running!")
})
app.listen(3000)

// معلومات السيرفر
const bot = mineflayer.createBot({
  host: '34.75.227.210',
  username: 'AntiCheatBot'
})

let playerLogs = {}

bot.on('spawn', () => {
  console.log("Bot joined the server!")
})

bot.on('playerCollect', (collector, collected) => {
  if (!collector || !collector.username) return
  
  const player = collector.username
  const item = collected.metadata?.[7]?.itemId
  
  if (!playerLogs[player]) {
    playerLogs[player] = { diamonds: 0, ancientDebris: 0, time: Date.now() }
  }

  const now = Date.now()
  const diff = (now - playerLogs[player].time) / 1000

  // 264 = Diamond , 743 = Netherite Scrap (حسب الاصدار)
  if (item === 264) playerLogs[player].diamonds++
  if (item === 743) playerLogs[player].ancientDebris++

  // إذا جمع أكثر من 10 دايموند خلال 60 ثانية
  if (playerLogs[player].diamonds >= 10 && diff < 60) {
    bot.chat(`/ban ${player} AutoFarm detected`)
    console.log(`Banned ${player} for fast diamond farming`)
  }

  // إذا جمع نذرايت بسرعة
  if (playerLogs[player].ancientDebris >= 5 && diff < 60) {
    bot.chat(`/ban ${player} Fast netherite detected`)
    console.log(`Banned ${player}`)
  }
})

bot.on('end', () => {
  console.log("Bot disconnected, reconnecting...")
  setTimeout(() => {
    process.exit()
  }, 5000)
})