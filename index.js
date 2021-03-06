require("dotenv").config();

const
  Discord = require("discord.js"),
  mongo = require("quickmongo"),
  fetch = require("node-fetch"),
  express = require("express"),
  lyricsFinder = require("lyrics-finder"),
  ws = require("express-ws"),
  crypto = require("crypto"),
  helmet = require("helmet"),
  io = require("@pm2/io"),
  SoundCloud = require("soundcloud-scraper"),
  RateLimit = require("express-rate-limit"),
  { readdirSync } = require("fs"),
  { DiscordTogether } = require("discord-together"),
  { join } = require("path");

const PREFIX = process.env.PREFIX;
let bootStart = Date.now();

const intents = new Discord.Intents([
  "GUILDS",
  "GUILD_MEMBERS",
  "GUILD_BANS",
  "GUILD_INTEGRATIONS",
  "GUILD_WEBHOOKS",
  "GUILD_INVITES",
  "GUILD_VOICE_STATES",
  "GUILD_MESSAGES",
  "GUILD_MESSAGE_REACTIONS",
  "GUILD_MESSAGE_TYPING",
  "DIRECT_MESSAGES",
]);
const client = new Discord.Client({
  allowedMentions: { parse: ["users", "roles"], repliedUser: true },
  restTimeOffset: 0,
  disableMentions: "everyone",
  intents: intents
});
const db = new mongo.Database(process.env.MONGO_DB_URL, "blackcat");
global.fetch = require("node-fetch");
client.login(process.env.TOKEN);
client.together = new DiscordTogether(client);
client.db = db;
client.commands = new Discord.Collection();
client.prefix = PREFIX;
client.players = new Map();
client.log = async function(msgContent, type) {
  const webhook = new Discord.WebhookClient({
    id: process.env.WEBHOOK_ID,
    token: process.env.WEBHOOK_SECRET
  });
  let content = `[Black cat] ${msgContent}`;
  switch (type) {
  case "info":
    webhook.send(content, {
      username: "Black cat log",
      avatarURL: "https://blackcatbot.tk/assets/info.png"
    });
    break;
  case "warn":
    webhook.send(content, {
      username: "Black cat log",
      avatarURL: "https://blackcatbot.tk/assets/warn.png"
    });
    break;
  case "error":
    webhook.send(content, {
      username: "Black cat log",
      avatarURL: "https://blackcatbot.tk/assets/error.png"
    });
    break;
  default:
    webhook.send(content, {
      username: "Black cat log",
      avatarURL: "https://blackcatbot.tk/assets/info.png"
    });
    break;
  }
};

const app = express();
const limiter = RateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: "429 Too many requests",
  onLimitReached: function(req) {
    client.log(`${req.headers["x-forwarded-for"]} has been rate-limited`, "warn");
  }
});
app.set("trust proxy", true);
ws(app);
app.use(helmet());
app.use(limiter);
app.use(express.json());

const cooldowns = new Discord.Collection();

SoundCloud.keygen()
  .then(key => {
    client.scKey = key;
    client.log(`Fetched SoundCloud key \`${key}\``, "info");
  })
  .catch(console.error);

client.on("ready", async () => {
  console.log(`Logged as ${client.user.username}`);
  console.log(`Bot is in ${client.guilds.cache.size} server(s)`);
  client.log(`Black cat ready, boot took ${Date.now() - bootStart}ms`, "info");
  delete bootStart;
  client.log(`Using FFmpeg engine \`${require("prism-media").FFmpeg.getInfo().version}\``, "info");
  client.user.setPresence({
    activities: [{
      name: `b.help | ${client.guilds.cache.size}????????????`,
      type: "STREAMING",
      url: "https://youtube.com/watch?v=lK-i-Ak0EAE"
    }],
    status: "dnd"
  });
});

db.on("ready", () => {
  console.log("Connected to DB");
  client.log("connected to DB", "info");
});

client.on("warn", (info) => console.log(info));
client.on("error", console.error);

const commandFiles = readdirSync(join(__dirname, "commands")).filter((file) => file.endsWith(".js"));
console.log("Loading all commands...");
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", `${file}`));
  client.commands.set(command.name, command);
}
console.log("All commands are loaded.");

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!(message.content.startsWith(PREFIX) || message.content.startsWith(PREFIX.toUpperCase()))) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const commandName = args.shift().toLowerCase();

  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.channel.send(`???? ??? ?????????${Math.ceil(timeLeft.toFixed(1))}???????????????${command.name}??????!!!`);
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.channel.send(`??? ??? ?????????????????????:${error.message}`).catch(console.error);
    message.client.log(`${error.message} (Command:${command.name})`, "error");
  }
});

/*client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    if (!oldState.channelID && newState.channelID) return;
    if (!oldState.guild || !newState.guild) return;
    const queue = client.players.get(oldState.guild.id);
    if (!queue) return;
    if (!queue.connection) return;
    if (!queue.songs.length || queue.songs.length === 0) return;
    if (queue.channel.members.filter(user => !user.bot).size <= 1) {
      setTimeout(function() {
        if (queue.channel.members.filter(user => !user.bot).size <= 1) {
          queue.textChannel.send("???? ??? ??????????????????????????????????????????????????????????????????").catch(console.error);
          queue.songs = [];
          try {
            queue.stop();
          } catch (e) {
            console.log(e.message);
          }
        }
      }, 15000);
    }
  } catch (error) {
    console.log(error);
  }
});*/

client.on("guildCreate", async guild => {
  client.user.setPresence({
    activities: [{
      name: `b.help | ${client.guilds.cache.size}????????????`,
      type: "STREAMING",
      url: "https://youtube.com/watch?v=lK-i-Ak0EAE"
    }],
    status: "dnd"
  });
  if (!guild.systemChannel) return;
  const embed = new Discord.MessageEmbed()
    .setTitle("????????????Black cat")
    .setDescription(
      "?????????????????????????????????????????????!**OWO**\n\n" +
      "[????????????Discord?????????](https://blackcatbot.tk/blackcat)\n" +
      "????????????????????????????????????Discord??????????????????????????????\n\n" +
      "????????????????????????????`b.help`???!\n" +
      "???????????????????`b.support`!")
    .setColor("BLURPLE")
    .setFooter("??????:?????????????????????????????????????????????????????????")
    .setFooter("By lollipop dev team");
  guild.systemChannel.send(embed);
  client.log(`Joined ${guild.name}`, "info");
});

client.on("guildDelete", guild => {
  client.user.setPresence({
    activities: [{
      name: `b.help | ${client.guilds.cache.size}????????????`,
      type: "STREAMING",
      url: "https://youtube.com/watch?v=lK-i-Ak0EAE"
    }],
    status: "dnd"
  });
  client.log(`Leave ${guild.name}`, "info");
});

client.on("interactionCreate", interaction => {
  if (!interaction.isCommand()) return;
  if (!interaction.inGuild()) return interaction.reply("??? ??? ??????????????????????????????!").catch(console.error);
  if (!interaction.guild) return interaction.reply("??? ??? ????????????????????????????????????!").catch(console.error);
  if (!interaction.channel.permissionsFor(interaction.guild.me).has([
    Discord.Permissions.FLAGS.EMBED_LINKS,
    Discord.Permissions.FLAGS.SEND_MESSAGES
  ])) return interaction.reply("??? ??? ???????????????????????????????????????!").catch(console.error);
  const message = {
    channel: interaction.channel,
    guild: interaction.guild,
    author: interaction.user,
    client,
    content: null,
    member: interaction.member,
    createdTimestamp: interaction.createdTimestamp,
    slash: {
      send: function(data) {
        return interaction.reply(data);
      },
      edit: function(data) {
        return interaction.editReply(data);
      },
      delete: function() {
        return interaction.deleteReply();
      }
    }
  };

  const commandName = interaction.commandName.toLowerCase();

  const command = client.commands.get(commandName);

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply(`???? ?????????${Math.ceil(timeLeft.toFixed(1))}???????????????${command.name}??????!!!`);
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  let args = [];
  interaction.options.data.forEach(option => {
    args.push(option.value);
  });
  message.content = `b. ${args.join(" ")}`;

  if(!command.slashReply) interaction.reply("?????????...");

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.channel.send(`??? ??? ?????????????????????:${error.message}`).catch(console.error);
    message.client.log(`${error.message} (Command:${command.name})`, "error");
  }
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "static", "200.html"));
});

app.ws("/api/ws/test", (ws) => {
  ws.on("message", msg => {
    ws.send(msg);
  });
});

app.ws("/api/ws/playing", (ws) => {
  try {
    ws.on("message", msg => {
      let jsonData = null;
      try {
        jsonData = JSON.parse(msg);
      } catch (e) {
        return console.log(e);
      }
      if (!jsonData.server) {
        ws.send(JSON.stringify({ exist: false }));
        return ws.close();
      }
      const guild = client.guilds.cache.get(jsonData.server);
      if (!guild) {
        ws.send(JSON.stringify({ exist: false }));
        return ws.close();
      }
      const queue = client.players.get(guild.id);
      if (!queue) {
        return ws.send(JSON.stringify({ playing: false }));
      }
      const song = queue.current;
      if (!song) {
        return ws.send(JSON.stringify({ playing: false }));
      }
      try {
        ws.send(JSON.stringify({
          name: guild.name,
          title: song.title,
          url: song.url,
          thumbnail: song.thumbnail,
          now: queue.playTime,
          total: Number(song.duration),
          pause: queue.playing,
          playing: true,
          volume: queue.volume
        }));
      } catch {
        ws.send(JSON.stringify({ playing: false }));
      }
    });
  } catch (e) {
    console.log(e);
  }
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/status", function(req, res) {
  res.send("online");
});

app.get("/loaderio-3cfcf9891b2ae7e544b9d6cdd3220394", (req, res) => {
  res.send("loaderio-3cfcf9891b2ae7e544b9d6cdd3220394");
});

app.get("/api/exist", async function(req, res) {
  if (!req.query.server) return res.send({ exist: false });
  let guild = client.guilds.cache.get(req.query.server);
  if (!guild) return res.send({ exist: false });
  res.send({ exist: true });
});

app.get("/api/lyrics", async function(req, res) {
  if (!req.query.title) return res.send({ error: true, code: 101 });
  let lyrics;
  try {
    lyrics = await lyricsFinder(req.query.title, "");
  } catch (error) {
    res.send({ error: true, code: 201 });
  }
  if (lyrics) return res.send({ lyrics });
  else return res.send({ error: true, code: 201 });
});

app.use((req, res, next) => {
  if (!req.query.token) next();
  else {
    try {
      let textParts = req.query.token.split(":");
      let iv = Buffer.from(textParts.shift(), "hex");
      let encryptedText = Buffer.from(textParts.join(":"), "hex");
      let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(process.env.ENCODE_KEY), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      req.userToken = decrypted.toString();
      next();
    } catch {
      res.clearCookie("token");
      next();
    }
  }
});

app.use(require("cookie-parser")());

app.get("/api/auth/login", function(req, res) {
  if (!req.query.code) return res.status(302).send({ token: null });
  const data = {
    client_id: client.application.id,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: "https://app.blackcatbot.tk/callback/",
    code: req.query.code,
    scope: "identify guilds"
  };
  fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams(data),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
    .then(res => res.json())
    .then(json => {
      let text = `${json.token_type} ${json.access_token}`;
      let iv = crypto.randomBytes(16);
      let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ENCODE_KEY), iv);
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      let token = iv.toString("hex") + ":" + encrypted.toString("hex");
      res.status(200).json({
        token
      });
    })
    .catch(error => {
      console.log(error);
      res.status(500).send({ error: true, message: "???????????????Discord????????????????????????" });
    });
});

app.get("/api/auth/info", function(req, res) {
  if (!req.userToken) return res.status(400).send({ error: true, message: "????????????Token??????????????????" });
  const token = req.userToken;
  fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: token
    }
  })
    .then(info => info.json())
    .then(json => res.send(json))
    .catch(error => {
      console.log(error);
      res.status(500).send({ error: true });
    });
});

async function checkModify(token, guildID) {
  return new Promise((reslove) => {
    fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: token
      }
    }).then(res => res.json()).then(async json => {
      const guild = await client.guilds.fetch(guildID).catch(() => { reslove(4); });
      const member = guild.members.cache.get(json.id);
      if (!member) reslove(1);
      else if (!member.voice.channel) reslove(2);
      else if (!member.voice.channel.members.get("848006097197334568")) reslove(3);
      else reslove(0);
    }).catch(() => reslove(1));
  });
}

app.get("/api/pause", async function(req, res) {
  if (!req.userToken || !req.query.guild) return res.send({ message: "????????????????????????????????????", red: true });
  const premission = await checkModify(req.userToken, req.query.guild);
  switch (premission) {
  case 1:
    return res.send({ message: "???????????????????????????!", red: true });
  case 2:
    return res.send({ message: "??????????????????????????????!", red: true });
  case 3:
    return res.send({ message: "????????????????????????????????????!", red: true });
  case 4:
    return res.send({ message: "?????????????????????", red: true });
  case 5:
    return res.send({ error: true, code: 101 });
  }
  try {
    const queue = client.players.get(req.query.guild);
    if (!queue) return res.send({ error: true, code: 101 });
    if (queue.playing) {
      queue.playing = false;
      queue.pause();
      queue.textChannel.send("<:pause:827737900359745586> ??? ??????????????????????????????").then(sent => {
        setTimeout(function() {
          sent.delete();
        }, 60000);
      }).catch(console.error);
      res.send({ message: "??????????????????!", red: false });
    } else {
      res.send({ message: "?????????????????????", red: true });
    }
  } catch (e) {
    res.send({ message: e, red: true });
  }
});

app.get("/api/resume", async function(req, res) {
  if (!req.userToken || !req.query.guild) return res.send({ message: "????????????????????????????????????", red: true });
  const premission = await checkModify(req.userToken, req.query.guild);
  switch (premission) {
  case 1:
    return res.send({ message: "???????????????????????????!", red: true });
  case 2:
    return res.send({ message: "??????????????????????????????!", red: true });
  case 3:
    return res.send({ message: "????????????????????????????????????!", red: true });
  case 4:
    return res.send({ message: "?????????????????????", red: true });
  case 5:
    return res.send({ error: true, code: 101 });
  }
  try {
    const queue = client.players.get(req.query.guild);
    if (!queue) return res.send({ error: true, code: 101 });
    if (!queue.playing) {
      queue.playing = true;
      queue.resume();
      queue.textChannel.send("<:play:827734196243398668> ??? ?????????????????????????????????").then(sent => {
        setTimeout(function() {
          sent.delete();
        }, 60000);
      }).catch(console.error);
      res.send({ message: "??????????????????!", red: false });
    } else {
      res.send({ message: "????????????????????????", red: true });
    }
  } catch (e) {
    res.send({ message: `???????????????????????????: ${e.message}`, red: true });
  }
});

app.get("/api/skip", async function(req, res) {
  if (!req.userToken || !req.query.guild) return res.send({ message: "????????????????????????????????????", red: true });
  const premission = await checkModify(req.userToken, req.query.guild);
  switch (premission) {
  case 1:
    return res.send({ message: "???????????????????????????!", red: true });
  case 2:
    return res.send({ message: "??????????????????????????????!", red: true });
  case 3:
    return res.send({ message: "????????????????????????????????????!", red: true });
  case 4:
    return res.send({ message: "?????????????????????", red: true });
  case 5:
    return res.send({ error: true, code: 101 });
  }
  try {
    const queue = client.players.get(req.query.guild);
    if (!queue) return res.send({ error: true, code: 101 });
    queue.playing = true;
    queue.skip();
    queue.textChannel.send("<:next:766802340538875964> ??? ?????????????????????????????????").then(sent => {
      setTimeout(function() {
        sent.delete();
      }, 60000);
    }).catch(console.error);
    res.send({ message: "??????????????????!", red: false });
  } catch (e) {
    res.send({ message: e, red: true });
  }
});

app.use((req, res) => {
  res.status(404).sendFile(join(__dirname, "static", "404.html"));
});

app.use(io.expressErrorHandler());

app.listen(process.env.PORT || 8080);

process.on("uncaughtException", (error) => console.error(error));
process.on("unhandledRejection", (error) => console.error(error));

process.on("exit", (code) => {
  console.log(`Process exit with code: ${code}`);
});

process.on("SIGINT", () => {
  client.destroy();
  process.exit(0);
});
