const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const GiveawayManager = require("./lib/giveawayManager");
const giveawayCommand = require("./commands/giveaway");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
client.commands.set(giveawayCommand.data.name, giveawayCommand);

client.giveawayManager = new GiveawayManager(
  client,
  path.join(__dirname, "data", "giveaways.json")
);

client.once("clientReady", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith("gw:")) {
      const handled = await giveawayCommand.handleComponent(interaction);
      if (handled) return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    console.error("Interaction error:", error);
    const payload = { content: "❌ Command failed.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

(async () => {
  await client.giveawayManager.init();
  await client.login(process.env.DISCORD_TOKEN);
})();
