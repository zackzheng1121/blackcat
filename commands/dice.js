const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "dice",
  description: "看看今天的運氣",
  register: true,
  slash: {
    name: "dice",
    description: "看看今天的運氣",
    options: [
      {
        name: "骰子面數",
        description: "骰子的面數",
        type: "INTEGER",
        required: false
      }
    ]
  },
  slashReply: true,
  async execute(message, args) {
    function getRandomNum(start, end) {
      return Math.floor(Math.random() * end) + start;
    }

    if (args.length) {
      if (isNaN(args[0])) return message.channel.send("❌ ┃ 請輸入正確的骰子面數!")
        .catch(console.error);
      if (Number(args[0]) < 6) return message.channel.send("❌ ┃ 請輸入大於6的數字!")
        .catch(console.error);
      const embed = new MessageEmbed()
        .setTitle("骰子!")
        .setDescription("🎲 ┃ 你得到了...")
        .setColor("BLURPLE");
      let sent = null;
      if (message.slash) message.slash.send({
        embeds: [embed]
      }).catch(console.error);
      else sent = await message.channel.send({
        embeds: [embed]
      }).catch(console.error);
      setTimeout(function() {
        if(sent) sent.edit({
          embeds: [embed]
        }).catch(console.error);
        else message.slash.edit({
          embeds: [embed]
        }).catch(console.error);
      }, 2000);
    } else {
      const embed = new MessageEmbed()
        .setTitle("骰子!")
        .setDescription("🎲 ┃ 你得到了...")
        .setColor("BLURPLE");
      let sent = null;
      if (message.slash) message.slash.send({
        embeds: [embed]
      }).catch(console.error);
      else sent = await message.channel.send({
        embeds: [embed]
      }).catch(console.error);
      setTimeout(function() {
        embed.setDescription(`🎲 ┃ 你得到了${getRandomNum(1, 6)}!`);
        if(sent) sent.edit({
          embeds: [embed]
        }).catch(console.error);
        else message.slash.edit({
          embeds: [embed]
        }).catch(console.error);
      }, 2000);
      return;
    }
  }
};