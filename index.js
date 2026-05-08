require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("Discord client error:", err);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("Login failed. Token may be invalid:", err.message);
  process.exit(1);
});
