const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Advanced giveaway system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a giveaway")
        .addStringOption((o) =>
          o.setName("prize").setDescription("Prize text").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("duration")
            .setDescription("e.g. 10m, 2h, 1d4h30m")
            .setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel to post giveaway")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addRoleOption((o) =>
          o
            .setName("required_role")
            .setDescription("Users must have this role to join")
        )
        .addRoleOption((o) =>
          o
            .setName("bonus_role")
            .setDescription("Role that gets bonus entries")
        )
        .addIntegerOption((o) =>
          o
            .setName("bonus_entries")
            .setDescription("Tickets for bonus role (default 2)")
            .setMinValue(2)
            .setMaxValue(10)
        )
        .addBooleanOption((o) =>
          o
            .setName("allow_leave")
            .setDescription("Allow users to leave by pressing button again")
        )
        .addBooleanOption((o) =>
          o
            .setName("ping_everyone")
            .setDescription("Ping everyone when giveaway starts")
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("End a giveaway immediately")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Reroll an ended giveaway")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName("winners")
            .setDescription("How many reroll winners (default original)")
            .setMinValue(1)
            .setMaxValue(20)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("pause")
        .setDescription("Pause a running giveaway")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("resume")
        .setDescription("Resume a paused giveaway")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit giveaway prize/winners/time")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("prize").setDescription("New prize text")
        )
        .addIntegerOption((o) =>
          o
            .setName("winners")
            .setDescription("New winner count")
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addStringOption((o) =>
          o
            .setName("add_time")
            .setDescription("e.g. +10m, -5m, +1h30m")
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List giveaways in this server")
        .addBooleanOption((o) =>
          o
            .setName("include_ended")
            .setDescription("Include ended giveaways")
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete giveaway from database")
        .addStringOption((o) =>
          o.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    ),

  async execute(interaction) {
    const manager = interaction.client.giveawayManager;
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("prize", true);
      const durationRaw = interaction.options.getString("duration", true);
      const winnerCount = interaction.options.getInteger("winners", true);
      const channel = interaction.options.getChannel("channel") ?? interaction.channel;
      const requiredRole = interaction.options.getRole("required_role");
      const bonusRole = interaction.options.getRole("bonus_role");
      const bonusEntries = interaction.options.getInteger("bonus_entries") ?? 2;
      const allowLeave = interaction.options.getBoolean("allow_leave") ?? true;
      const pingEveryone = interaction.options.getBoolean("ping_everyone") ?? false;

      if (!channel?.isTextBased()) {
        return interaction.reply({
          ephemeral: true,
          content: "❌ Channel must be text-based.",
        });
      }

      const durationMs = manager.parseDuration(durationRaw);
      if (!durationMs) {
        return interaction.reply({
          ephemeral: true,
          content: "❌ Invalid duration. Examples: `10m`, `2h`, `1d4h30m`",
        });
      }

      const giveaway = manager.createGiveaway({
        guildId: interaction.guildId,
        channelId: channel.id,
        hostId: interaction.user.id,
        prize,
        winnerCount,
        durationMs,
        requiredRoleId: requiredRole?.id ?? null,
        bonusRoleId: bonusRole?.id ?? null,
        bonusEntries,
        allowLeave,
        pingEveryone,
      });

      const payload = manager.buildMessagePayload(giveaway);
      if (giveaway.pingEveryone) {
        payload.content = "@everyone 🎉 New giveaway!";
      }

      const message = await channel.send(payload);
      giveaway.messageId = message.id;
      await manager.registerGiveaway(giveaway);

      return interaction.reply({
        ephemeral: true,
        content: `✅ Giveaway started in ${channel} with ID \`${giveaway.id}\``,
      });
    }

    if (sub === "end") {
      const id = interaction.options.getString("id", true);
      const result = await manager.endGiveaway(id, { endedBy: interaction.user.id });
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }
      return interaction.reply({
        ephemeral: true,
        content: `✅ Ended giveaway \`${id}\``,
      });
    }

    if (sub === "reroll") {
      const id = interaction.options.getString("id", true);
      const winners = interaction.options.getInteger("winners") ?? null;

      const result = await manager.rerollGiveaway(id, winners, interaction.user.id);
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }

      return interaction.reply({
        ephemeral: true,
        content: `✅ Rerolled \`${id}\` -> ${result.winners.length} winner(s).`,
      });
    }

    if (sub === "pause") {
      const id = interaction.options.getString("id", true);
      const result = await manager.pauseGiveaway(id);
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }
      return interaction.reply({ ephemeral: true, content: `✅ Paused \`${id}\`` });
    }

    if (sub === "resume") {
      const id = interaction.options.getString("id", true);
      const result = await manager.resumeGiveaway(id);
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }
      return interaction.reply({ ephemeral: true, content: `✅ Resumed \`${id}\`` });
    }

    if (sub === "edit") {
      const id = interaction.options.getString("id", true);
      const prize = interaction.options.getString("prize");
      const winnerCount = interaction.options.getInteger("winners");
      const addTimeRaw = interaction.options.getString("add_time");

      let addMs = 0;
      if (addTimeRaw) {
        let text = addTimeRaw.trim();
        let sign = 1;
        if (text.startsWith("+")) text = text.slice(1);
        else if (text.startsWith("-")) {
          sign = -1;
          text = text.slice(1);
        }

        const parsed = manager.parseDuration(text);
        if (!parsed) {
          return interaction.reply({
            ephemeral: true,
            content: "❌ Invalid `add_time`. Example: `+10m`, `-5m`, `+1h30m`",
          });
        }
        addMs = sign * parsed;
      }

      if (!prize && !winnerCount && !addTimeRaw) {
        return interaction.reply({
          ephemeral: true,
          content: "❌ Provide at least one edit field (`prize`, `winners`, or `add_time`).",
        });
      }

      const result = await manager.editGiveaway(id, { prize, winnerCount, addMs });
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }

      return interaction.reply({ ephemeral: true, content: `✅ Edited \`${id}\`` });
    }

    if (sub === "list") {
      const includeEnded = interaction.options.getBoolean("include_ended") ?? false;
      const list = manager.list(interaction.guildId, { includeEnded });

      if (!list.length) {
        return interaction.reply({
          ephemeral: true,
          content: "No giveaways found for this server.",
        });
      }

      const lines = list.slice(0, 25).map((g) => {
        const state = g.ended
          ? "ended"
          : g.paused
            ? `paused (${manager.formatDuration(g.remainingMs)})`
            : `ends <t:${Math.floor(g.endAt / 1000)}:R>`;
        return `• \`${g.id}\` — **${g.prize}** — ${state}`;
      });

      return interaction.reply({
        ephemeral: true,
        content: lines.join("\n"),
      });
    }

    if (sub === "delete") {
      const id = interaction.options.getString("id", true);
      const result = await manager.deleteGiveaway(id);
      if (!result.ok) {
        return interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
      }
      return interaction.reply({
        ephemeral: true,
        content: `✅ Deleted giveaway \`${id}\` from storage.`,
      });
    }

    return interaction.reply({ ephemeral: true, content: "Unknown subcommand." });
  },

  async handleComponent(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("gw:")) return false;

    const manager = interaction.client.giveawayManager;
    const parts = interaction.customId.split(":");
    const action = parts[1];
    const giveawayId = parts[2];

    if (!action || !giveawayId) return false;

    if (action === "entries") {
      const gw = manager.get(giveawayId);
      if (!gw) {
        await interaction.reply({ ephemeral: true, content: "❌ Giveaway not found." });
        return true;
      }

      const yourTickets = gw.entrants[interaction.user.id] ?? 0;
      const msg = [
        `**Giveaway ID:** \`${gw.id}\``,
        `**Prize:** ${gw.prize}`,
        `**Unique entries:** ${manager.getUniqueEntryCount(gw)}`,
        `**Total tickets:** ${manager.getTotalTicketCount(gw)}`,
        `**Your tickets:** ${yourTickets}`,
      ].join("\n");

      await interaction.reply({ ephemeral: true, content: msg });
      return true;
    }

    if (action === "toggle") {
      const result = await manager.toggleEntry(giveawayId, interaction.user.id, interaction.member);
      if (!result.ok) {
        await interaction.reply({ ephemeral: true, content: `❌ ${result.reason}` });
        return true;
      }

      if (result.joined) {
        await interaction.reply({
          ephemeral: true,
          content: `✅ You joined! Tickets: **${result.tickets}**`,
        });
      } else if (result.left) {
        await interaction.reply({
          ephemeral: true,
          content: "✅ You left the giveaway.",
        });
      } else {
        await interaction.reply({
          ephemeral: true,
          content: "✅ Updated.",
        });
      }
      return true;
    }

    return false;
  },
};
