cat > index.js <<'EOF'
const { Client, GatewayIntentBits } = require("discord.js");

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Run token prompt command first.');
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
EOF
