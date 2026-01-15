#!/usr/bin/env node

/**
 * Apple Notes CLI
 * Quick note creation for macOS
 */

const NotesCore = require('./notes-core');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class NotesCLI {
  constructor() {
    this.core = new NotesCore({
      debug: process.env.DEBUG === 'true'
    });
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(`
${colors.cyan}Apple Notes CLI${colors.reset} v${packageJson.version}

${colors.yellow}Usage:${colors.reset}
  notes-cli notes list [--limit N]          List all notes (default limit: 20)
  notes-cli folders list                    List all folders
  notes-cli folder create <name>            Create a new folder
  notes-cli folder delete <name>            Delete a folder
  notes-cli note <note-id>                  Show note content in markdown
  notes-cli note create <title> [body] [@F] Create a new note (optionally in folder F)
  notes-cli note edit <note-id> [options]   Edit an existing note
  notes-cli note delete <note-id>           Delete a note
  notes-cli --version                       Show version
  notes-cli --update                        Check for updates
  notes-cli --help                          Show this help

${colors.yellow}Edit Options:${colors.reset}
  --title "New Title"    Update the note title
  --body "New content"   Update the note body

${colors.yellow}Examples:${colors.reset}
  notes-cli notes list --limit 10
  notes-cli folders list
  notes-cli folder create "Work"
  notes-cli folder delete "Work"
  notes-cli note create "My Note" "Some content here"
  notes-cli note create "Work Task" "Details here" @Work
  notes-cli note edit <note-id> --title "New Title"
  notes-cli note delete <note-id>
  
${colors.yellow}AI Assistant Integration:${colors.reset}
  Say any of these to your AI assistant:
  • "note - xyz" or "/note xyz" → Save xyz to Notes
  • "Save this in Apple Notes" → After content creation
  • "Summarize this session in my Apple Notes"
  • "Create a note with [topic]"

${colors.yellow}Markdown Support:${colors.reset}
  # Headings
  **bold** and *italic*
  - Lists and • bullets
  \`code\` and code blocks
  > Quotes

${colors.gray}Environment:${colors.reset}
  DEBUG=true    Enable debug output
`);
  }

  /**
   * Show AI assistant friendly message
   */
  showAIMessage() {
    console.log(`
${colors.cyan}📝 Apple Notes Integration Ready!${colors.reset}

I can save content directly to your Apple Notes!

${colors.yellow}Just say:${colors.reset}
  • ${colors.green}"note - xyz"${colors.reset} or ${colors.green}"/note xyz"${colors.reset} → I'll save xyz to Notes
  • ${colors.green}"Save this in Apple Notes"${colors.reset} → After I create content
  • ${colors.green}"Summarize this session in my Apple Notes"${colors.reset}
  • ${colors.green}"Create a note with [topic]"${colors.reset}

${colors.yellow}Examples:${colors.reset}
  • /note Meeting Notes from today
  • note - Python Cheatsheet
  • Create an article about React Hooks and save it
  • Summarize our conversation in Apple Notes

What would you like me to save to your Notes?
`);
  }

  /**
   * Show version
   */
  showVersion() {
    console.log(`${colors.cyan}apple-notes-cli${colors.reset} v${packageJson.version}`);
  }

  /**
   * Check for updates
   */
  async checkUpdate() {
    try {
      console.log(`${colors.cyan}Checking for updates...${colors.reset}`);

      // Get latest version from npm (secure, no shell)
      const npmResult = spawnSync('npm', ['view', 'apple-notes-cli', 'version'], {
        encoding: 'utf8',
        shell: false,
        timeout: 10000
      });

      if (npmResult.status !== 0) {
        throw new Error('npm check failed');
      }

      const latestVersion = npmResult.stdout.trim();
      const currentVersion = packageJson.version;

      if (latestVersion === currentVersion) {
        console.log(`${colors.green}✓${colors.reset} You have the latest version (v${currentVersion})`);
      } else {
        console.log(`${colors.yellow}Update available:${colors.reset} v${currentVersion} → v${latestVersion}`);
        console.log(`\nTo update, run:\n  ${colors.cyan}npm install -g apple-notes-cli${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.gray}Could not check for updates${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.message, colors.reset);
      }
    }
  }

  /**
   * List notes
   */
  async listNotes(options = {}) {
    try {
      const limit = options.limit || 20;
      const notes = await this.core.list({ limit });

      if (notes.length === 0) {
        console.log(`${colors.yellow}No notes found${colors.reset}`);
        return;
      }

      console.log(`\n${colors.cyan}📝 Your Notes${colors.reset} (${notes.length} shown)\n`);

      notes.forEach((note, index) => {
        const num = String(index + 1).padStart(2, ' ');
        console.log(`${colors.gray}${num}.${colors.reset} ${colors.green}${note.name}${colors.reset}`);
        console.log(`    ${colors.gray}Folder: ${note.folder}${colors.reset}`);
        console.log(`    ${colors.gray}ID: ${note.id}${colors.reset}`);
        console.log(`    ${colors.gray}Modified: ${note.modificationDate}${colors.reset}`);
      });

      console.log('');
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * List all folders
   */
  async listFolders() {
    try {
      const folders = await this.core.listFolders();

      if (folders.length === 0) {
        console.log(`${colors.yellow}No folders found${colors.reset}`);
        return;
      }

      console.log(`\n${colors.cyan}📁 Your Folders${colors.reset} (${folders.length} total)\n`);

      folders.forEach((folder, index) => {
        const num = String(index + 1).padStart(2, ' ');
        const noteText = folder.noteCount === 1 ? 'note' : 'notes';
        console.log(`${colors.gray}${num}.${colors.reset} ${colors.green}${folder.name}${colors.reset} ${colors.gray}(${folder.noteCount} ${noteText})${colors.reset}`);
      });

      console.log('');
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(name) {
    try {
      if (!name) {
        console.error(`${colors.red}Error: Folder name required${colors.reset}`);
        console.log(`\nUsage: notes-cli folder create <name>`);
        process.exit(1);
      }

      const result = await this.core.createFolder(name);
      console.log(`${colors.green}✓${colors.reset} ${result}`);
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolderCLI(name) {
    try {
      if (!name) {
        console.error(`${colors.red}Error: Folder name required${colors.reset}`);
        console.log(`\nUsage: notes-cli folder delete <name>`);
        process.exit(1);
      }

      const result = await this.core.deleteFolder(name);
      console.log(`${colors.green}✓${colors.reset} ${result}`);
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Delete a note
   */
  async deleteNoteCLI(noteId) {
    try {
      if (!noteId) {
        console.error(`${colors.red}Error: Note ID required${colors.reset}`);
        console.log(`\nUsage: notes-cli note delete <note-id>`);
        process.exit(1);
      }

      const result = await this.core.deleteNote(noteId);
      console.log(`${colors.green}✓${colors.reset} ${result}`);
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Show a note's content
   */
  async showNote(noteId) {
    try {
      if (!noteId) {
        console.error(`${colors.red}Error: Note ID required${colors.reset}`);
        console.log(`\nUsage: notes-cli show <note-id>`);
        console.log(`\nTip: Use 'notes-cli list' to see note IDs`);
        process.exit(1);
      }

      const note = await this.core.show(noteId);
      const markdown = this.core.convertHTMLToMarkdown(note.body);

      console.log(`\n${colors.cyan}# ${note.name}${colors.reset}\n`);
      console.log(markdown);
      console.log('');
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Create a note
   */
  async createNote(title, body = '', options = {}) {
    try {
      if (!title) {
        console.error(`${colors.red}Error: Title required${colors.reset}`);
        this.showHelp();
        process.exit(1);
      }

      const result = await this.core.create(title, body, options);
      console.log(`${colors.green}✓${colors.reset} ${result}`);
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }

  /**
   * Edit a note
   */
  async editNote(noteId, options = {}) {
    try {
      if (!noteId) {
        console.error(`${colors.red}Error: Note ID required${colors.reset}`);
        console.log(`\nUsage: notes-cli note edit <note-id> [--title "Title"] [--body "Content"]`);
        process.exit(1);
      }

      if (!options.title && !options.body) {
        console.error(`${colors.red}Error: Specify --title or --body to update${colors.reset}`);
        console.log(`\nUsage: notes-cli note edit <note-id> [--title "Title"] [--body "Content"]`);
        process.exit(1);
      }

      const result = await this.core.update(noteId, options);
      console.log(`${colors.green}✓${colors.reset} ${result}`);
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      if (process.env.DEBUG === 'true') {
        console.error(colors.gray, error.stack, colors.reset);
      }
      process.exit(1);
    }
  }
}

// Main
async function main() {
  const cli = new NotesCLI();
  const args = process.argv.slice(2);

  // Handle commands
  const command = args[0];

  // Version
  if (command === '--version' || command === '-v') {
    cli.showVersion();
    process.exit(0);
  }

  // Update
  if (command === '--update' || command === '-u') {
    await cli.checkUpdate();
    process.exit(0);
  }

  // AI Assistant mode (legacy)
  if (command === '/note') {
    cli.showAIMessage();
    process.exit(0);
  }

  // Help
  if (!command || command === '--help' || command === '-h' || command === 'help' || command === '/help') {
    cli.showHelp();
    process.exit(0);
  }

  const subCommand = args[1];

  // notes list [--limit N]
  if (command === 'notes' && subCommand === 'list') {
    let limit = 20;
    const limitIndex = args.indexOf('--limit');
    if (limitIndex !== -1 && args[limitIndex + 1]) {
      limit = parseInt(args[limitIndex + 1], 10) || 20;
    }
    await cli.listNotes({ limit });
    process.exit(0);
  }

  // folders list
  if (command === 'folders' && subCommand === 'list') {
    await cli.listFolders();
    process.exit(0);
  }

  // folder create <name>
  if (command === 'folder' && subCommand === 'create') {
    const folderName = args[2];
    await cli.createFolder(folderName);
    process.exit(0);
  }

  // folder delete <name>
  if (command === 'folder' && subCommand === 'delete') {
    const folderName = args[2];
    await cli.deleteFolderCLI(folderName);
    process.exit(0);
  }

  // note <note-id> (show note content)
  // note create <title> [body] [@Folder]
  // note edit <note-id> [--title "..."] [--body "..."]
  if (command === 'note') {
    if (subCommand === 'create') {
      // Parse @Folder syntax - find argument starting with @
      let folder = null;
      let bodyArgs = [];

      for (let i = 3; i < args.length; i++) {
        if (args[i].startsWith('@')) {
          folder = args[i].substring(1); // Remove the @ prefix
        } else {
          bodyArgs.push(args[i]);
        }
      }

      const title = args[2];
      const body = bodyArgs.join(' ');

      if (!title) {
        console.error(`${colors.red}Error: Title required${colors.reset}`);
        console.log(`\nUsage: notes-cli note create <title> [body] [@FolderName]`);
        process.exit(1);
      }
      await cli.createNote(title, body, { folder });
      process.exit(0);
    } else if (subCommand === 'edit') {
      const noteId = args[2];

      // Parse --title and --body options
      const titleIndex = args.indexOf('--title');
      const bodyIndex = args.indexOf('--body');

      const options = {};
      if (titleIndex !== -1 && args[titleIndex + 1]) {
        options.title = args[titleIndex + 1];
      }
      if (bodyIndex !== -1 && args[bodyIndex + 1]) {
        options.body = args[bodyIndex + 1];
      }

      await cli.editNote(noteId, options);
      process.exit(0);
    } else if (subCommand === 'delete') {
      const noteId = args[2];
      await cli.deleteNoteCLI(noteId);
      process.exit(0);
    } else if (subCommand) {
      // subCommand is the note ID
      await cli.showNote(subCommand);
      process.exit(0);
    } else {
      cli.showAIMessage();
      process.exit(0);
    }
  }

  // Legacy commands for backward compatibility
  // list [--limit N]
  if (command === 'list' || command === '--list' || command === '-l') {
    let limit = 20;
    const limitIndex = args.indexOf('--limit');
    if (limitIndex !== -1 && args[limitIndex + 1]) {
      limit = parseInt(args[limitIndex + 1], 10) || 20;
    }
    await cli.listNotes({ limit });
    process.exit(0);
  }

  // folders (legacy)
  if (command === 'folders' && !subCommand) {
    await cli.listFolders();
    process.exit(0);
  }

  // show <note-id> (legacy)
  if (command === 'show' || command === '--show' || command === '-s') {
    const noteId = args[1];
    await cli.showNote(noteId);
    process.exit(0);
  }

  // create <title> [body] (legacy)
  if (command === 'create' || command === 'add') {
    const title = args[1];
    const body = args.slice(2).join(' ');
    if (!title) {
      console.error(`${colors.red}Error: Title required${colors.reset}`);
      cli.showHelp();
      process.exit(1);
    }
    await cli.createNote(title, body);
    process.exit(0);
  }

  // Unknown command
  console.error(`${colors.red}Error: Unknown command '${command}'${colors.reset}`);
  cli.showHelp();
  process.exit(1);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  if (process.env.DEBUG === 'true') {
    console.error(error);
  }
  process.exit(1);
});

// Start CLI
if (require.main === module) {
  main();
}

module.exports = NotesCLI;
