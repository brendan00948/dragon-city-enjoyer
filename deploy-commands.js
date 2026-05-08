const { REST, Routes } = require("discord.js");
const giveawayCommand = require("./commands/giveaway");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("Missing CLIENT_ID");
  process.exit(1);
}

if (!process.env.GUILD_ID) {
  console.error("Missing GUILD_ID");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [giveawayCommand.data.toJSON()] }
    );
    console.log("✅ Slash commands deployed.");
  } catch (err) {
    console.error("❌ Deploy failed:", err);
    process.exit(1);
  }
})();
