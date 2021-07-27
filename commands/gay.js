const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "gay",
  description: "查看自己的Gay指數",
  regsiter: true,
  slash: {
    name: "gay",
    description: "查看自己的Gay指數"
  },
  slashReply: true,
  execute(message) {
    function getRandomNum(start, end) {
      return start + Math.random() * (end - start + 1);
    }

    const gay = Math.ceil(getRandomNum(1, 100));
    const gayPercent = Math.floor(gay / 10);
    const bar = ("🏳️‍🌈 ".repeat(gayPercent) + "❌ ".repeat(10 - gayPercent)).trim();

    if (!message.slash.raw) {
      if (message.mentions.members.size > 0) {
        const embed = new MessageEmbed()
          .setTitle(`${message.mentions.members.first().displayName}的Gay指數`)
          .setDescription(`🏳️‍🌈 ┃ ${message.mentions.members.first().displayName}的Gay指數是${gay}\n\n${bar}`)
          .setColor("#5865F2");
        return message.channel.send(embed).catch(console.error);
      } else {
        const embed = new MessageEmbed()
          .setTitle(`${message.author.username}的Gay指數`)
          .setDescription(`🏳️‍🌈 ┃ 你的Gay指數是${gay}\n\n${bar}`)
          .setColor("#5865F2");
        if (message.slash.raw) return message.slash.sendEmbed(embed);
        else return message.channel.send(embed).catch(console.error);
      }
    } else {
      const embed = new MessageEmbed()
        .setTitle(`${message.author.username}的Gay指數`)
        .setDescription(`🏳️‍🌈 ┃ 你的Gay指數是${gay}\n\n${bar}`)
        .setColor("#5865F2");
      if (message.slash.raw) return message.slash.sendEmbed(embed);
      else return message.channel.send(embed).catch(console.error);
    }
  }
};