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
   */
  setupClaudeCommands() {
    console.log(`\n${colors.cyan}Setting up Claude Code slash commands...${colors.reset}`);

    // Possible Claude config locations
    const claudeConfigPaths = [
      path.join(this.homeDir, '.claude', 'commands.json'),
      path.join(this.homeDir, '.config', 'claude', 'commands.json'),
      path.join(this.homeDir, 'Library', 'Application Support', 'Claude', 'commands.json')
    ];

    const noteCommands = [
      {
        name: 'note',
        description: 'Create a new Apple Note',
        command: 'notes-cli',
        args: ['note', 'create', '$1', '$2'],
        example: '/note "Meeting Notes" "## Agenda\\n- Item 1\\n- Item 2"'
      },
      {
        name: 'note-list',
        description: 'List all Apple Notes',
        command: 'notes-cli',
        args: ['notes', 'list', '--limit', '20'],
        example: '/note-list'
      },
      {
        name: 'folders',
        description: 'List all Apple Notes folders',
        command: 'notes-cli',
        args: ['folders', 'list'],
        example: '/folders'
      },
      {
        name: 'note-show',
        description: 'Show content of an Apple Note',
        command: 'notes-cli',
        args: ['note', '$1'],
        example: '/note-show <note-id>'
      },
      {
        name: 'folder-create',
        description: 'Create a new folder in Apple Notes',
        command: 'notes-cli',
        args: ['folder', 'create', '$1'],
        example: '/folder-create "Work"'
      }
    ];

    let configured = false;

    for (const configPath of claudeConfigPaths) {
      const configDir = path.dirname(configPath);

      if (fs.existsSync(configDir)) {
        try {
          let commands = [];

          // Read existing commands if file exists
          if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            commands = JSON.parse(content);

            // Check if commands already exist
            if (commands.find(cmd => cmd.name === 'note')) {
              console.log(`  ${colors.gray}✓ Note commands already configured${colors.reset}`);
              configured = true;
              continue;
            }
          }

          // Add our commands
          commands.push(...noteCommands);

          // Write back
          fs.writeFileSync(configPath, JSON.stringify(commands, null, 2));
          console.log(`  ${colors.green}✓ Added note commands to Claude (${noteCommands.length} commands)${colors.reset}`);
          configured = true;
          break;
        } catch (error) {
          console.log(`  ${colors.gray}Could not configure ${configPath}${colors.reset}`);
        }
      }
    }

    if (!configured) {
      console.log(`  ${colors.yellow}ℹ Claude config not found. You can manually add the commands later.${colors.reset}`);
    }
  }

  /**
   * Info about Codex CLI usage
   */
  showCodexInfo() {
    console.log(`\n${colors.cyan}Codex CLI Integration:${colors.reset}`);
    console.log(`  ${colors.gray}Codex CLI can use the shell aliases and full commands:${colors.reset}`);
    console.log(`\n  ${colors.yellow}Notes:${colors.reset}`);
    console.log(`    • "notes-cli notes list" - list all notes`);
    console.log(`    • "notes-cli note create 'Title' 'Content' @Folder" - create note`);
    console.log(`    • "notes-cli note <id>" - show note content`);
    console.log(`    • "notes-cli note edit <id> --title 'New'" - edit note`);
    console.log(`    • "notes-cli note delete <id>" - delete note`);
    console.log(`\n  ${colors.yellow}Folders:${colors.reset}`);
    console.log(`    • "notes-cli folders list" - list folders`);
    console.log(`    • "notes-cli folder create 'Name'" - create folder`);
    console.log(`    • "notes-cli folder delete 'Name'" - delete folder`);
    console.log(`\n  ${colors.yellow}Natural language:${colors.reset}`);
    console.log(`    • "create a note about X"`);
    console.log(`    • "list my Apple Notes"`);
    console.log(`    • "delete the note about Y"`);
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