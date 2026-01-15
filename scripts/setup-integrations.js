#!/usr/bin/env node

/**
 * Post-Install Setup Script
 * Konfiguriert Aliases und Slash Commands für verschiedene CLIs
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class SetupIntegrations {
  constructor() {
    this.homeDir = os.homedir();
    this.shellConfigFiles = [
      '.zshrc',
      '.bashrc',
      '.bash_profile',
      '.profile'
    ];
  }

  /**
   * Setup Shell Aliases
   */
  setupShellAliases() {
    console.log(`\n${colors.cyan}Setting up shell aliases...${colors.reset}`);

    const aliasContent = `
# Apple Notes CLI shortcuts
alias note='notes-cli'
alias n='notes-cli'
`;

    let setupCount = 0;

    for (const configFile of this.shellConfigFiles) {
      const configPath = path.join(this.homeDir, configFile);

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');

        // Check if aliases already exist
        if (content.includes("alias note='notes-cli'")) {
          console.log(`  ${colors.gray}✓ Aliases already configured in ${configFile}${colors.reset}`);
          continue;
        }

        // Add aliases
        try {
          fs.appendFileSync(configPath, aliasContent);
          console.log(`  ${colors.green}✓ Added aliases to ${configFile}${colors.reset}`);
          setupCount++;
        } catch (error) {
          console.log(`  ${colors.yellow}⚠ Could not modify ${configFile}: ${error.message}${colors.reset}`);
        }
      }
    }

    if (setupCount > 0) {
      console.log(`\n  ${colors.green}Shell aliases configured! Restart your terminal or run 'source ~/.zshrc' (or ~/.bashrc)${colors.reset}`);
    }
  }

  /**
   * Setup Claude Code Slash Commands
   * Claude Code uses Markdown files in ~/.claude/commands/ directory
   */
  setupClaudeCommands() {
    console.log(`\n${colors.cyan}Setting up Claude Code slash commands...${colors.reset}`);

    const claudeCommandsDir = path.join(this.homeDir, '.claude', 'commands');

    // Define commands as Markdown files with notecli- prefix
    const commands = {
      'notecli-notes-list': `List all Apple Notes with folder info.

Run: notes-cli notes list --limit 20`,

      'notecli-note-create': `Create a new Apple Note.

Arguments:
- $1: Title of the note
- $2: Content (supports markdown)
- Optional: @FolderName to specify folder

Run: notes-cli note create "$1" "$2"

Example: /notecli-note-create "Meeting Notes" "## Agenda\\n- Item 1"`,

      'notecli-note-show': `Show content of an Apple Note.

Arguments:
- $1: Note ID (get from /notecli-notes-list)

Run: notes-cli note "$1"`,

      'notecli-note-edit': `Edit an existing Apple Note.

Arguments:
- $1: Note ID
- $2: New title (optional)
- $3: New body (optional)

Run: notes-cli note edit "$1" --title "$2" --body "$3"`,

      'notecli-note-delete': `Delete an Apple Note.

Arguments:
- $1: Note ID

Run: notes-cli note delete "$1"`,

      'notecli-folders-list': `List all Apple Notes folders.

Run: notes-cli folders list`,

      'notecli-folder-create': `Create a new folder in Apple Notes.

Arguments:
- $1: Folder name

Run: notes-cli folder create "$1"`,

      'notecli-folder-delete': `Delete a folder in Apple Notes.

Arguments:
- $1: Folder name

Run: notes-cli folder delete "$1"`
    };

    try {
      // Create commands directory if it doesn't exist
      if (!fs.existsSync(claudeCommandsDir)) {
        fs.mkdirSync(claudeCommandsDir, { recursive: true });
        console.log(`  ${colors.green}✓ Created ${claudeCommandsDir}${colors.reset}`);
      }

      let createdCount = 0;
      let existingCount = 0;

      for (const [name, content] of Object.entries(commands)) {
        const filePath = path.join(claudeCommandsDir, `${name}.md`);

        if (fs.existsSync(filePath)) {
          existingCount++;
          continue;
        }

        fs.writeFileSync(filePath, content);
        createdCount++;
      }

      if (createdCount > 0) {
        console.log(`  ${colors.green}✓ Created ${createdCount} slash commands${colors.reset}`);
      }
      if (existingCount > 0) {
        console.log(`  ${colors.gray}✓ ${existingCount} commands already exist${colors.reset}`);
      }

      console.log(`  ${colors.gray}Commands: /notecli-notes-list, /notecli-note-create, /notecli-folder-create, etc.${colors.reset}`);

    } catch (error) {
      console.log(`  ${colors.yellow}⚠ Could not setup Claude commands: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Info about Codex CLI usage
   */
  showCodexInfo() {
    console.log(`\n${colors.cyan}Codex CLI Integration:${colors.reset}`);
    console.log(`  ${colors.gray}Codex CLI can use the full commands directly:${colors.reset}`);
    console.log(`\n  ${colors.yellow}Notes:${colors.reset}`);
    console.log(`    • notes-cli notes list`);
    console.log(`    • notes-cli note create "Title" "Content" @Folder`);
    console.log(`    • notes-cli note <id>`);
    console.log(`    • notes-cli note edit <id> --title "New"`);
    console.log(`    • notes-cli note delete <id>`);
    console.log(`\n  ${colors.yellow}Folders:${colors.reset}`);
    console.log(`    • notes-cli folders list`);
    console.log(`    • notes-cli folder create "Name"`);
    console.log(`    • notes-cli folder delete "Name"`);
  }

  /**
   * Ask for user confirmation
   */
  async askConfirmation(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${question} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Main setup
   */
  async run() {
    console.log(`${colors.cyan}🔧 Apple Notes CLI - Integration Setup${colors.reset}`);
    console.log(`\n${colors.yellow}This script will modify your shell configuration files.${colors.reset}`);
    console.log(`It will add aliases for easier access to the notes CLI.\n`);

    // Ask for confirmation
    const confirmed = await this.askConfirmation('Do you want to proceed with the setup?');

    if (!confirmed) {
      console.log(`\n${colors.gray}Setup cancelled. You can run 'npm run setup' later if needed.${colors.reset}`);
      process.exit(0);
    }

    // Setup shell aliases with confirmation
    const setupAliases = await this.askConfirmation('\nAdd shell aliases (note, n)?');
    if (setupAliases) {
      this.setupShellAliases();
    }

    // Setup Claude commands with confirmation
    const setupClaude = await this.askConfirmation('\nSetup Claude Code integration?');
    if (setupClaude) {
      this.setupClaudeCommands();
    }

    // Show Codex info
    this.showCodexInfo();

    if (setupAliases || setupClaude) {
      console.log(`\n${colors.green}✅ Setup complete!${colors.reset}`);
      console.log(`\n${colors.gray}You can now use:${colors.reset}`);
      if (setupAliases) {
        console.log(`  • ${colors.cyan}note "Title" "Content"${colors.reset} - Shell alias (works in terminal & Codex CLI)`);
        console.log(`  • ${colors.cyan}n "Title"${colors.reset} - Short alias`);
      }
      if (setupClaude) {
        console.log(`  • ${colors.cyan}/note "Title" "Content"${colors.reset} - Claude Code slash command`);
      }
    } else {
      console.log(`\n${colors.gray}No changes were made.${colors.reset}`);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupIntegrations();
  setup.run().catch(console.error);
}

module.exports = SetupIntegrations;