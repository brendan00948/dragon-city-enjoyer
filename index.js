const { Client, GatewayIntentBits } = require("discord.js");
if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Run: export DISCORD_TOKEN="MTQ1NTQ0MzE1MDA4MzQ1NzA5MA.Gn60AT.2tdrVc2nup4hFlFSqcT-czFtrncFcUWklG7OsA"');
  process.exit(1);
}
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Login failed:", err.message);
  process.exit(1);
});
