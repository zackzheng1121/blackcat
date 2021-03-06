const { canModifyQueue } = require("../util/Util");

module.exports = {
  name: "skipto",
  aliases: ["st"],
  description: "跳到指定的歌曲",
  register: true,
  slash: {
    name: "skipto",
    description: "跳到指定的歌曲",
    options: [
      {
        name: "歌曲編號",
        description: "在播放清單中的歌曲編號",
        type: "INTEGER",
        required: true,
      }
    ]
  },
  slashReply: true,
  execute(message, args) {
    if (!args.length) return message.channel.send("❌ ┃ 請輸入歌曲代碼").catch(console.error);

    if (isNaN(args[0])) return message.channel.send("❌ ┃ 請輸入歌曲代碼")
      .catch(console.error);

    const queue = message.client.players.get(message.guild.id);
    if (!queue) {
      if (message.slash) message.slash.send("❌ ┃ 目前沒有任何歌曲正在播放!")
        .catch(console.error);
      return message.channel.send("❌ ┃ 目前沒有任何歌曲正在播放!")
        .catch(console.error);
    }
    if (!canModifyQueue(message.member)) {
      if (message.slash) return message.slash
        .send("❌ ┃ 你必須跟我在同一個頻道裡!")
        .catch(console.error);
      else return message.channel
        .send("❌ ┃ 你必須跟我在同一個頻道裡!")
        .catch(console.error);
    }

    if (args[0] > queue.songs.length) {
      if (message.slash) return message.slash.send(`❌ ┃ 播放清單只有 ${queue.songs.length} 首歌!`)
        .catch(console.error);
      else return message.channel.send(`❌ ┃ 播放清單只有 ${queue.songs.length} 首歌!`)
        .catch(console.error);
    }

    if (queue.loop) {
      for (let i = 0; i < args[0] - 2; i++) {
        queue.songs.push(queue.songs.shift());
      }
    } else {
      queue.songs = queue.songs.slice(args[0] - 2);
    }
    queue.skip();
    if(message.slash) return message.slash.send(`<:skip:827734282318905355> ┃ 跳到第 ${args[0]} 首歌曲`)
      .catch(console.error);
    else return message.channel.send(`<:skip:827734282318905355> ┃ 跳到第 ${args[0]} 首歌曲`)
      .catch(console.error);
  }
};