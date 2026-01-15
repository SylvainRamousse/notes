#!/usr/bin/env node

/**
 * Apple Notes MCP Server
 * Exposes Apple Notes CLI functions as MCP tools
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const NotesCore = require('./notes-core');

// Initialize NotesCore
const notesCore = new NotesCore({ debug: process.env.DEBUG === 'true' });

// Create MCP server
const server = new McpServer({
    name: 'apple-notes',
    version: '1.0.0',
});

// Tool: List all notes
server.tool(
    'notes_list',
    'List all Apple Notes with folder info',
    {
        limit: z.number().optional().default(20).describe('Maximum number of notes to return'),
    },
    async ({ limit }) => {
        try {
            const notes = await notesCore.list({ limit });
            const formatted = notes.map(n =>
                `• ${n.name}\n  Folder: ${n.folder}\n  ID: ${n.id}\n  Modified: ${n.modificationDate}`
            ).join('\n\n');
            return {
                content: [{ type: 'text', text: formatted || 'No notes found.' }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: List all folders
server.tool(
    'folders_list',
    'List all Apple Notes folders with note counts',
    {},
    async () => {
        try {
            const folders = await notesCore.listFolders();
            const formatted = folders.map(f =>
                `• ${f.name} (${f.noteCount} notes)`
            ).join('\n');
            return {
                content: [{ type: 'text', text: formatted || 'No folders found.' }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Create a folder
server.tool(
    'folder_create',
    'Create a new folder in Apple Notes',
    {
        name: z.string().describe('Name of the folder to create'),
    },
    async ({ name }) => {
        try {
            const result = await notesCore.createFolder(name);
            return {
                content: [{ type: 'text', text: result }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Delete a folder (destructive)
server.tool(
    'folder_delete',
    {
        description: 'Delete a folder from Apple Notes (DESTRUCTIVE)',
        destructiveHint: true,
    },
    {
        name: z.string().describe('Name of the folder to delete'),
    },
    async ({ name }) => {
        try {
            const result = await notesCore.deleteFolder(name);
            return {
                content: [{ type: 'text', text: result }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Show note content
server.tool(
    'note_show',
    'Show the content of an Apple Note in markdown format',
    {
        noteId: z.string().describe('The ID of the note to show'),
    },
    async ({ noteId }) => {
        try {
            const note = await notesCore.show(noteId);
            const markdown = notesCore.convertHTMLToMarkdown(note.body);
            return {
                content: [{ type: 'text', text: `# ${note.name}\n\n${markdown}` }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Create a note
server.tool(
    'note_create',
    'Create a new Apple Note',
    {
        title: z.string().describe('Title of the note'),
        body: z.string().optional().default('').describe('Content of the note (supports markdown)'),
        folder: z.string().optional().describe('Folder to create the note in (optional)'),
    },
    async ({ title, body, folder }) => {
        try {
            const options = folder ? { folder } : {};
            const result = await notesCore.create(title, body, options);
            return {
                content: [{ type: 'text', text: result }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Edit a note (destructive - modifies content)
server.tool(
    'note_edit',
    {
        description: 'Edit an existing Apple Note (MODIFIES CONTENT)',
        destructiveHint: true,
    },
    {
        noteId: z.string().describe('The ID of the note to edit'),
        title: z.string().optional().describe('New title for the note'),
        body: z.string().optional().describe('New content for the note (supports markdown)'),
    },
    async ({ noteId, title, body }) => {
        try {
            const updates = {};
            if (title) updates.title = title;
            if (body) updates.body = body;

            if (!updates.title && !updates.body) {
                return {
                    content: [{ type: 'text', text: 'Error: Specify title or body to update.' }],
                    isError: true,
                };
            }

            const result = await notesCore.update(noteId, updates);
            return {
                content: [{ type: 'text', text: result }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Delete a note (destructive)
server.tool(
    'note_delete',
    {
        description: 'Delete an Apple Note (DESTRUCTIVE)',
        destructiveHint: true,
    },
    {
        noteId: z.string().describe('The ID of the note to delete'),
    },
    async ({ noteId }) => {
        try {
            const result = await notesCore.deleteNote(noteId);
            return {
                content: [{ type: 'text', text: result }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Apple Notes MCP server started');
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});
