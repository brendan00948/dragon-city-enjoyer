// setup-token.js
const fs = require("node:fs");
const path = require("node:path");
const { Client, GatewayIntentBits } = require("discord.js");

/**
 * Paste your NEW token here, run once, then clear it.
 * Example: const TOKEN = "YOUR_TOKEN";
 */
const TOKEN = "PASTE_NEW_BOT_TOKEN_HERE";

if (!TOKEN || TOKEN.includes("PASTE_NEW_BOT_TOKEN_HERE")) {
  console.error("Please paste your real bot token into TOKEN first.");
  process.exit(1);
}

function upsertEnvVar(filePath, key, value) {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }

  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    if (content.length && !content.endsWith("\n")) content += "\n";
    content += line + "\n";
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function ensureGitignoreHas(filePath, entry) {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }

  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.includes(entry)) {
    lines.push(entry);
    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
  }
}

(async () => {
  const envPath = path.join(process.cwd(), ".env");
  const gitignorePath = path.join(process.cwd(), ".gitignore");

  // Save token to .env
  upsertEnvVar(envPath, "DISCORD_TOKEN", TOKEN);

  // Safety: keep .env out of git
  ensureGitignoreHas(gitignorePath, ".env");
  ensureGitignoreHas(gitignorePath, "node_modules");

  console.log("Saved DISCORD_TOKEN to .env and updated .gitignore.");

  // Validate token by logging in
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const timeout = setTimeout(() => {
    console.error("Token test timed out (15s). Check token/internet and try again.");
    client.destroy();
    process.exit(1);
  }, 15000);

  client.once("ready", () => {
    clearTimeout(timeout);
    console.log(`✅ Token works. Logged in as: ${client.user.tag}`);
    client.destroy();
    process.exit(0);
  });

  try {
    await client.login(TOKEN);
  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ Token login failed:", err.message);
    process.exit(1);
  }
})();
