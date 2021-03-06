const { MessageEmbed, MessageAttachment } = require("discord.js");

module.exports = {
  name: "question",
  description: "趣味問答",
  register: true,
  slash: {
    name: "question",
    description: "趣味問答",
    options: [
      {
        name: "問題內容",
        description: "要詢問的問題",
        type: "STRING",
        required: true
      }
    ]
  },
  async execute(message, args) {
    const answer = [
      "可以啊",
      "應該可以",
      "不要吧",
      "我看見了失敗的光芒",
      "不能啦",
      "不知道...讓我想想看...",
      "_Black cat已離線_",
      "拒絕回答"
    ];
    const randomAnswer = answer[Math.floor(Math.random() * answer.length)];
    const question = args.join(" ");
    if (!args.length) return message.channel.send("❌ ┃ 你要問我什麼呢?")
      .catch(console.error);

    const embed = new MessageEmbed()
      .setTitle("問答!")
      .setDescription(`❓ ┃ ${question}的答案...`)
      .setColor("BLURPLE");
    let sent = null;
    if (message.slash) message.channel.send({
      embeds: [embed]
    }).catch(console.error);
    else await message.channel.send({
      embeds: [embed]
    }).catch(console.error);
    embed.setDescription(`❓ ┃ 對於${question}我的回答是${randomAnswer}`);
    setTimeout(() => {
      if(sent) sent.edit({
        embeds: [embed]
      }).catch(console.error);
      else message.slash.edit({
        embeds: [embed]
      }).catch(console.error);
    }, 2000);
  }
};