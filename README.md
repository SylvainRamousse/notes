# Apple Notes CLI

> Fork of [marcusvoelkel/notes](https://github.com/marcusvoelkel/notes) with extended capabilities.

CLI tool for managing notes in Apple Notes on macOS.

## Features

- **List notes** with folder information
- **List folders** with note counts
- **Create folders** for organization
- **Create notes** with Markdown support
- **Create notes in specific folders** using `@FolderName` syntax
- **View note content** in Markdown format
- **Edit notes** - update title or body
- **Delete notes and folders**

## Requirements

- macOS
- Node.js ≥ 14.0.0

## Installation

### Via npm (recommended)
```bash
npm install -g apple-notes-cli@latest
```

### Via GitHub
```bash
git clone https://github.com/marcusvoelkel/notes.git
cd notes
npm install
npm link
```

### Setup Integration (Automatic on Install)
The post-install script automatically configures:
- Shell aliases (`note`, `n`) in .zshrc/.bashrc
- Claude Code Slash Command (`/note`)
- Codex CLI Integration (if installed)

Manual setup if needed:
```bash
npm run setup
```

## Usage

### Commands

```bash
# List all notes
notes-cli notes list
notes-cli notes list --limit 10

# List all folders
notes-cli folders list

# Create a new folder
notes-cli folder create "Work"

# Delete a folder
notes-cli folder delete "Work"

# Create a new note
notes-cli note create "Title" "Content with **markdown**"

# Create a note in a specific folder (using @FolderName)
notes-cli note create "Task" "Details here" @Work

# Show note content in markdown
notes-cli note <note-id>

# Edit a note
notes-cli note edit <note-id> --title "New Title"
notes-cli note edit <note-id> --body "New content"
notes-cli note edit <note-id> --title "Title" --body "Content"

# Delete a note
notes-cli note delete <note-id>

# Show version
notes-cli --version

# Check for updates
notes-cli --update

# Show help
notes-cli --help
```

### Shortcuts/Aliases

After installation, the following shortcuts are configured:
- `note` - Alias for `notes-cli`
- `n` - Short alias for `notes-cli`

```bash
note notes list
note folder create "Projects"
note note create "My Note" "Content" @Projects
n notes list
```

### AI Assistant Integration

Works seamlessly with AI assistants:
```bash
# Natural language in Claude, Codex CLI, etc.
"Summarize this chat in an Apple Note..."
"Create an Apple Note about..."
"Write an article and save it in Apple Notes"
```

## Markdown Support

Notes support the following Markdown formatting:

- `# Heading` - Headings (H1-H3)
- `**bold**` and `*italic*`
- `- Item` - Bullet lists
- `1. Item` - Numbered lists
- `` `code` `` - Inline code
- ` ``` ` - Code blocks
- `---` - Horizontal rules

## Examples

```bash
# List your notes with folder info
notes-cli notes list --limit 5

# See all your folders
notes-cli folders list

# Create a Work folder
notes-cli folder create "Work"

# Create a meeting note in Work folder
notes-cli note create "Team Meeting" "## Agenda\n- Updates\n- Planning" @Work

# Edit a note's title
notes-cli note edit <note-id> --title "Updated Meeting Notes"

# Delete a note
notes-cli note delete <note-id>

# Delete a folder
notes-cli folder delete "Work"
```

## Debug

```bash
DEBUG=true notes-cli notes list
```

## MCP Server

An MCP (Model Context Protocol) server is included for direct LLM integration.

### Available Tools

| Tool | Description |
|------|-------------|
| `notes_list` | List all notes |
| `folders_list` | List all folders |
| `folder_create` | Create a folder |
| `folder_delete` | Delete a folder |
| `note_show` | Show note content |
| `note_create` | Create a note |
| `note_edit` | Edit a note |
| `note_delete` | Delete a note |

### Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apple-notes": {
      "command": "node",
      "args": ["/path/to/notes/mcp-server.js"]
    }
  }
}
```

Or if installed globally via npm:

```json
{
  "mcpServers": {
    "apple-notes": {
      "command": "notes-mcp"
    }
  }
}
```

## License

MIT