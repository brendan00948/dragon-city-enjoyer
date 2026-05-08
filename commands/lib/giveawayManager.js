const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const MAX_TIMEOUT = 2_147_000_000; // ~24.8 days

class GiveawayManager {
  constructor(client, dataFile) {
    this.client = client;
    this.dataFile = dataFile;
    this.giveaways = new Map();
    this.timers = new Map();
    this._saveQueue = Promise.resolve();
  }

  async init() {
    await this._ensureDataFile();

    let list = [];
    try {
      const raw = await fs.readFile(this.dataFile, "utf8");
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    for (const item of list) {
      const g = this._normalize(item);
      this.giveaways.set(g.id, g);
    }

    for (const g of this.giveaways.values()) {
      if (!g.ended && !g.paused) this.schedule(g.id);
      if (!g.ended && !g.paused && g.endAt <= Date.now()) {
        this.endGiveaway(g.id, { endedBy: "system" }).catch(console.error);
      }
    }
  }

  async _ensureDataFile() {
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    try {
      await fs.access(this.dataFile);
    } catch {
      await fs.writeFile(this.dataFile, "[]\n", "utf8");
    }
  }

  _normalize(g) {
    return {
      id: g.id,
      guildId: g.guildId,
      channelId: g.channelId,
      messageId: g.messageId ?? null,
      hostId: g.hostId,
      prize: g.prize ?? "Unknown Prize",
      winnerCount: Number(g.winnerCount ?? 1),
      createdAt: Number(g.createdAt ?? Date.now()),
      endAt: Number(g.endAt ?? Date.now() + 60000),
      ended: Boolean(g.ended),
      endedAt: g.endedAt ?? null,
      endedBy: g.endedBy ?? null,
      paused: Boolean(g.paused),
      pausedAt: g.pausedAt ?? null,
      remainingMs: g.remainingMs ?? null,
      winners: Array.isArray(g.winners) ? g.winners : [],
      entrants: g.entrants && typeof g.entrants === "object" ? g.entrants : {},
      requiredRoleId: g.requiredRoleId ?? null,
      bonusRoleId: g.bonusRoleId ?? null,
      bonusEntries: Number(g.bonusEntries ?? 2),
      allowLeave: g.allowLeave ?? true,
      pingEveryone: g.pingEveryone ?? false,
      lastReroll: g.lastReroll ?? null,
    };
  }

  async save() {
    const data = JSON.stringify([...this.giveaways.values()], null, 2) + "\n";
    this._saveQueue = this._saveQueue
      .then(() => fs.writeFile(this.dataFile, data, "utf8"))
      .catch((err) => {
        console.error("Save error:", err);
      });
    return this._saveQueue;
  }

  generateId() {
    return crypto.randomBytes(4).toString("hex");
  }

  parseDuration(input) {
    if (!input || typeof input !== "string") return null;
    const text = input.toLowerCase().replace(/\s+/g, "");
    if (!text) return null;

    const unitMap = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    let total = 0;
    let consumed = "";
    const regex = /(\d+)([smhd])/g;
    let m;

    while ((m = regex.exec(text)) !== null) {
      const value = Number(m[1]);
      const unit = m[2];
      consumed += m[0];
      total += value * unitMap[unit];
    }

    if (!total) return null;
    if (consumed.length !== text.length) return null;
    return total;
  }

  formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "0s";
    let sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    sec %= 86400;
    const h = Math.floor(sec / 3600);
    sec %= 3600;
    const m = Math.floor(sec / 60);
    sec %= 60;

    const out = [];
    if (d) out.push(`${d}d`);
    if (h) out.push(`${h}h`);
    if (m) out.push(`${m}m`);
    if (sec) out.push(`${sec}s`);
    return out.join(" ");
  }

  createGiveaway({
    guildId,
    channelId,
    hostId,
    prize,
    winnerCount,
    durationMs,
    requiredRoleId = null,
    bonusRoleId = null,
    bonusEntries = 2,
    allowLeave = true,
    pingEveryone = false,
  }) {
    return {
      id: this.generateId(),
      guildId,
      channelId,
      messageId: null,
      hostId,
      prize,
      winnerCount,
      createdAt: Date.now(),
      endAt: Date.now() + durationMs,
      ended: false,
      endedAt: null,
      endedBy: null,
      paused: false,
      pausedAt: null,
      remainingMs: null,
      winners: [],
      entrants: {},
      requiredRoleId,
      bonusRoleId,
      bonusEntries,
      allowLeave,
      pingEveryone,
      lastReroll: null,
    };
  }

  async registerGiveaway(giveaway) {
    this.giveaways.set(giveaway.id, giveaway);
    await this.save();
    this.schedule(giveaway.id);
    return giveaway;
  }

  get(id) {
    return this.giveaways.get(id) ?? null;
  }

  list(guildId, { includeEnded = false } = {}) {
    const arr = [...this.giveaways.values()].filter((g) => g.guildId === guildId);
    const filtered = includeEnded ? arr : arr.filter((g) => !g.ended);
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    return filtered;
  }

  getUniqueEntryCount(g) {
    return Object.keys(g.entrants).length;
  }

  getTotalTicketCount(g) {
    return Object.values(g.entrants).reduce((sum, n) => sum + Number(n || 0), 0);
  }

  _memberHasRole(member, roleId) {
    if (!roleId) return true;
    if (!member) return false;

    if (member.roles?.cache) return member.roles.cache.has(roleId);
    if (Array.isArray(member.roles)) return member.roles.includes(roleId);
    return false;
  }

  _buildActiveEmbed(g) {
    const endField = g.paused
      ? `⏸ Paused (${this.formatDuration(g.remainingMs ?? 0)} left)`
      : `<t:${Math.floor(g.endAt / 1000)}:R>`;

    const reqRole = g.requiredRoleId ? `<@&${g.requiredRoleId}>` : "None";
    const bonus = g.bonusRoleId
      ? `<@&${g.bonusRoleId}> (${g.bonusEntries} tickets)`
      : "None";

    return new EmbedBuilder()
      .setColor(g.paused ? 0xf4a261 : 0x9b5de5)
      .setTitle(g.paused ? "⏸ Giveaway Paused" : "🎉 Giveaway")
      .setDescription(`**Prize:** ${g.prize}`)
      .addFields(
        { name: "Winners", value: String(g.winnerCount), inline: true },
        { name: "Ends", value: endField, inline: true },
        { name: "Host", value: `<@${g.hostId}>`, inline: true },
        { name: "Entries", value: String(this.getUniqueEntryCount(g)), inline: true },
        { name: "Tickets", value: String(this.getTotalTicketCount(g)), inline: true },
        { name: "Allow Leave", value: g.allowLeave ? "Yes" : "No", inline: true },
        { name: "Required Role", value: reqRole, inline: true },
        { name: "Bonus Role", value: bonus, inline: true },
        { name: "Giveaway ID", value: `\`${g.id}\``, inline: true }
      )
      .setTimestamp();
  }

  _buildEndedEmbed(g) {
    const winnerText = g.winners.length
      ? g.winners.map((id) => `<@${id}>`).join(", ")
      : "No valid entries";

    return new EmbedBuilder()
      .setColor(0xffb703)
      .setTitle("🎉 Giveaway Ended")
      .setDescription(`**Prize:** ${g.prize}`)
      .addFields(
        { name: "Host", value: `<@${g.hostId}>`, inline: true },
        { name: "Entries", value: String(this.getUniqueEntryCount(g)), inline: true },
        { name: "Winners", value: winnerText, inline: false },
        { name: "Giveaway ID", value: `\`${g.id}\``, inline: true }
      )
      .setTimestamp(g.endedAt ?? Date.now());
  }

  _buildComponents(g) {
    const joinLabel = g.allowLeave ? "Join / Leave" : "Join Giveaway";
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gw:toggle:${g.id}`)
          .setLabel(g.ended ? "Giveaway Ended" : joinLabel)
          .setStyle(ButtonStyle.Success)
          .setDisabled(g.ended),
        new ButtonBuilder()
          .setCustomId(`gw:entries:${g.id}`)
          .setLabel("View Entries")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(false)
      ),
    ];
  }

  buildMessagePayload(g) {
    return {
      embeds: [g.ended ? this._buildEndedEmbed(g) : this._buildActiveEmbed(g)],
      components: this._buildComponents(g),
    };
  }

  async updateMessage(g) {
    if (!g.messageId) return;
    const channel = await this.client.channels.fetch(g.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.messages.fetch(g.messageId).catch(() => null);
    if (!msg) return;

    await msg.edit(this.buildMessagePayload(g)).catch(() => {});
  }

  async toggleEntry(giveawayId, userId, member) {
    const g = this.get(giveawayId);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (g.ended) return { ok: false, reason: "Giveaway already ended." };

    if (!this._memberHasRole(member, g.requiredRoleId)) {
      return { ok: false, reason: "You do not have the required role for this giveaway." };
    }

    const existing = g.entrants[userId] ?? 0;

    if (existing > 0) {
      if (!g.allowLeave) {
        return { ok: false, reason: "Leaving is disabled for this giveaway." };
      }
      delete g.entrants[userId];
      await this.save();
      await this.updateMessage(g);
      return { ok: true, left: true };
    }

    const hasBonus = this._memberHasRole(member, g.bonusRoleId);
    const tickets = hasBonus ? Math.max(2, g.bonusEntries) : 1;

    g.entrants[userId] = tickets;
    await this.save();
    await this.updateMessage(g);

    return { ok: true, joined: true, tickets };
  }

  _pickWinners(g, count, exclude = []) {
    const excluded = new Set(exclude);
    const pool = [];

    for (const [userId, tickets] of Object.entries(g.entrants)) {
      if (excluded.has(userId)) continue;
      for (let i = 0; i < Number(tickets || 0); i++) pool.push(userId);
    }

    const winners = [];
    const winnerSet = new Set();

    while (winners.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const picked = pool[idx];
      if (!winnerSet.has(picked)) {
        winnerSet.add(picked);
        winners.push(picked);
      }

      for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i] === picked) pool.splice(i, 1);
      }
    }

    return winners;
  }

  async endGiveaway(id, { endedBy = "system" } = {}) {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (g.ended) return { ok: false, reason: "Giveaway already ended." };

    this._clearTimer(id);

    g.ended = true;
    g.paused = false;
    g.remainingMs = null;
    g.endedAt = Date.now();
    g.endedBy = endedBy;
    g.winners = this._pickWinners(g, g.winnerCount);

    await this.save();
    await this.updateMessage(g);

    const channel = await this.client.channels.fetch(g.channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      if (g.winners.length) {
        await channel
          .send(`🎊 Congrats ${g.winners.map((id) => `<@${id}>`).join(", ")}! You won **${g.prize}**`)
          .catch(() => {});
      } else {
        await channel.send(`No winners for **${g.prize}** (no valid entries).`).catch(() => {});
      }
    }

    return { ok: true, giveaway: g };
  }

  async rerollGiveaway(id, winnerCount = null, rerolledBy = "system") {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (!g.ended) return { ok: false, reason: "Giveaway must be ended before reroll." };

    const count = winnerCount ?? g.winnerCount;
    let winners = this._pickWinners(g, count, g.winners);

    if (!winners.length) {
      winners = this._pickWinners(g, count);
    }

    if (!winners.length) return { ok: false, reason: "No eligible entries to reroll." };

    g.lastReroll = {
      at: Date.now(),
      by: rerolledBy,
      winners,
    };
    await this.save();

    const channel = await this.client.channels.fetch(g.channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel
        .send(`🔁 Reroll for **${g.prize}**: ${winners.map((id) => `<@${id}>`).join(", ")}`)
        .catch(() => {});
    }

    return { ok: true, winners };
  }

  async pauseGiveaway(id) {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (g.ended) return { ok: false, reason: "Giveaway already ended." };
    if (g.paused) return { ok: false, reason: "Giveaway already paused." };

    this._clearTimer(id);

    g.paused = true;
    g.pausedAt = Date.now();
    g.remainingMs = Math.max(5000, g.endAt - Date.now());

    await this.save();
    await this.updateMessage(g);

    return { ok: true, giveaway: g };
  }

  async resumeGiveaway(id) {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (g.ended) return { ok: false, reason: "Giveaway already ended." };
    if (!g.paused) return { ok: false, reason: "Giveaway is not paused." };

    g.paused = false;
    g.pausedAt = null;
    g.endAt = Date.now() + Math.max(5000, g.remainingMs ?? 5000);
    g.remainingMs = null;

    await this.save();
    this.schedule(id);
    await this.updateMessage(g);

    return { ok: true, giveaway: g };
  }

  async editGiveaway(id, { prize, winnerCount, addMs = 0 }) {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };
    if (g.ended) return { ok: false, reason: "Cannot edit an ended giveaway." };

    if (typeof prize === "string" && prize.trim()) {
      g.prize = prize.trim();
    }

    if (Number.isInteger(winnerCount) && winnerCount > 0) {
      g.winnerCount = winnerCount;
    }

    if (addMs) {
      if (g.paused) {
        g.remainingMs = Math.max(5000, (g.remainingMs ?? 0) + addMs);
      } else {
        g.endAt = Math.max(Date.now() + 5000, g.endAt + addMs);
      }
    }

    await this.save();
    if (!g.paused) this.schedule(id);
    await this.updateMessage(g);

    return { ok: true, giveaway: g };
  }

  async deleteGiveaway(id) {
    const g = this.get(id);
    if (!g) return { ok: false, reason: "Giveaway not found." };

    this._clearTimer(id);
    this.giveaways.delete(id);
    await this.save();

    return { ok: true };
  }

  _clearTimer(id) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  schedule(id) {
    this._clearTimer(id);

    const g = this.get(id);
    if (!g || g.ended || g.paused) return;

    const left = g.endAt - Date.now();
    if (left <= 0) {
      this.endGiveaway(id, { endedBy: "system" }).catch(console.error);
      return;
    }

    const delay = Math.min(left, MAX_TIMEOUT);
    const timer = setTimeout(() => {
      this._scheduleTick(id).catch(console.error);
    }, delay);

    this.timers.set(id, timer);
  }

  async _scheduleTick(id) {
    const g = this.get(id);
    if (!g || g.ended || g.paused) return;

    const left = g.endAt - Date.now();
    if (left <= 0) {
      await this.endGiveaway(id, { endedBy: "system" });
      return;
    }

    this.schedule(id);
  }
}

module.exports = GiveawayManager;
