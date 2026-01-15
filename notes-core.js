/**
 * Apple Notes Core Module
 * Fast and reliable note creation for macOS
 */

const { spawn } = require('child_process');

class NotesCore {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 15000;
  }

  /**
   * Führt AppleScript sicher aus
   */
  async executeAppleScript(script) {
    return new Promise((resolve, reject) => {
      const osascript = spawn('osascript', ['-']);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        try {
          osascript.kill('SIGTERM');
        } catch (_) { }
        reject(new Error('AppleScript timeout'));
      }, this.timeoutMs);

      osascript.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      osascript.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      osascript.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(stderr || 'AppleScript failed'));
        } else {
          if (this.debug && stderr) {
            console.error('AppleScript warning:', stderr);
          }
          resolve(stdout.trim());
        }
      });

      osascript.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      // Send script to stdin
      osascript.stdin.write(script);
      osascript.stdin.end();
    });
  }

  /**
   * Validate and clean input
   */
  validateInput(input, type = 'text') {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: expected string');
    }

    if (type === 'title' && input.length > 255) {
      throw new Error('Title too long (max 255 chars)');
    }

    if (type === 'title' && input.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    return input.trim();
  }

  /**
   * Escaped Text für AppleScript (sicher gegen Injection)
   */
  escapeForAppleScript(text) {
    if (!text) return '';

    // First remove any dangerous AppleScript commands before any escaping
    // This ensures they are removed even if surrounded by special characters
    text = text.replace(/\btell\b/gi, 't_e_l_l');  // Neutralize 'tell'
    text = text.replace(/\bend\s+tell\b/gi, 'e_n_d_t_e_l_l');  // Neutralize 'end tell'

    // Remove dangerous control characters but keep common ones
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove Unicode control characters except newlines
    text = text.replace(/[\u2028\u2029]/g, '');

    // Remove zero-width characters that could be used for obfuscation  
    text = text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\uFEFF]/g, '');

    // Escape special AppleScript characters
    // WICHTIG: Reihenfolge ist kritisch!
    text = text
      .replace(/\\/g, '\\\\')       // Backslashes first
      .replace(/"/g, '\\"')         // Double quotes
      .replace(/\r\n/g, '\\n')      // Windows line endings to Unix
      .replace(/\r/g, '\\n')        // Mac line endings to Unix  
      .replace(/\n/g, '\\n')        // Preserve newlines as escaped
      .replace(/[\t]/g, '\\t')      // Preserve tabs
      .replace(/[\f\v]/g, ' ')      // Replace other whitespace with space
      .replace(/}/g, '')            // Remove closing braces (prevent breaking out)
      .replace(/{/g, '');           // Remove opening braces

    // Truncate very long texts to prevent AppleScript issues
    const maxLength = 50000; // Safe limit for AppleScript
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... (truncated)';
    }

    return text;
  }

  /**
   * Remove dangerous HTML while keeping safe formatting
   */
  sanitizeHTML(text) {
    // Remove script tags and content
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    text = text.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    text = text.replace(/javascript:/gi, '');

    // Remove dangerous tags only
    const dangerous = ['script', 'iframe', 'object', 'embed', 'form'];
    dangerous.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^>]*>(?:.*?<\\/${tag}>)?`, 'gi');
      text = text.replace(regex, '');
    });

    return text;
  }

  /**
   * Convert Markdown to HTML for Apple Notes
   */
  convertToHTML(text) {
    // Sanitize dangerous content only
    text = this.sanitizeHTML(text);

    let html = text;

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g,
      '<blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #ddd;font-family:monospace;white-space:pre-wrap">$1</blockquote>');

    // Inline code
    html = html.replace(/`([^`]+)`/g,
      '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:monospace">$1</code>');

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:20px;margin:20px 0 16px">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:24px;margin:24px 0 16px">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:28px;margin:28px 0 20px">$1</h1>');

    // Bullet lists
    html = html.replace(/((?:^[\*\-] .+$\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(item => {
        const content = item.replace(/^[\*\-] /, '');
        return '<li style="margin-bottom:8px">' + content + '</li>';
      }).join('');
      return '<ul style="margin:16px 0;padding-left:24px">' + items + '</ul>';
    });

    // Numbered lists
    html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(item => {
        const content = item.replace(/^\d+\. /, '');
        return '<li style="margin-bottom:8px">' + content + '</li>';
      }).join('');
      return '<ol style="margin:16px 0;padding-left:24px">' + items + '</ol>';
    });

    // Bold and italic
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">');

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p style="margin:12px 0">');
    html = html.replace(/\n/g, '<br>');

    // Container
    return '<div style="font-size:16px;line-height:1.6;font-family:-apple-system,sans-serif"><p style="margin:12px 0">' +
      html + '</p></div>';
  }

  /**
   * List all folders from Apple Notes
   * @returns {Array} Array of folder objects with id, name, and noteCount
   */
  async listFolders() {
    const script = `
      tell application "Notes"
        set folderList to {}
        repeat with aFolder in folders
          set folderId to id of aFolder
          set folderName to name of aFolder
          set folderNoteCount to count of notes in aFolder
          set end of folderList to folderId & "|||" & folderName & "|||" & folderNoteCount
        end repeat
        set AppleScript's text item delimiters to "###"
        return folderList as text
      end tell
    `;

    const result = await this.executeAppleScript(script);

    if (!result || result.trim() === '') {
      return [];
    }

    const folders = result.split('###').map(folderStr => {
      const [id, name, noteCount] = folderStr.split('|||');
      return {
        id: id?.trim() || '',
        name: name?.trim() || '',
        noteCount: parseInt(noteCount?.trim() || '0', 10)
      };
    }).filter(folder => folder.id && folder.name);

    return folders;
  }

  /**
   * Create a new folder in Apple Notes
   * @param {string} name - The name of the folder to create
   * @returns {string} Success message
   */
  async createFolder(name) {
    const validName = this.validateInput(name, 'title');
    const escapedName = this.escapeForAppleScript(validName);

    const script = `
      tell application "Notes"
        try
          make new folder with properties {name:"${escapedName}"}
          return "Folder created: ${escapedName}"
        on error errMsg
          error "Failed to create folder: " & errMsg
        end try
      end tell
    `;

    return await this.executeAppleScript(script);
  }

  /**
   * Delete a note by ID
   * @param {string} noteId - The ID of the note to delete
   * @returns {string} Success message
   */
  async deleteNote(noteId) {
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Invalid note ID');
    }

    const escapedId = this.escapeForAppleScript(noteId);

    const script = `
      tell application "Notes"
        try
          set theNote to note id "${escapedId}"
          set noteName to name of theNote
          delete theNote
          return "Note deleted: " & noteName
        on error errMsg
          error "Note not found: " & errMsg
        end try
      end tell
    `;

    return await this.executeAppleScript(script);
  }

  /**
   * Delete a folder by name
   * @param {string} folderName - The name of the folder to delete
   * @returns {string} Success message
   */
  async deleteFolder(folderName) {
    if (!folderName || typeof folderName !== 'string') {
      throw new Error('Invalid folder name');
    }

    const escapedName = this.escapeForAppleScript(folderName);

    const script = `
      tell application "Notes"
        try
          set targetFolder to folder "${escapedName}"
          delete targetFolder
          return "Folder deleted: ${escapedName}"
        on error errMsg
          error "Folder not found: " & errMsg
        end try
      end tell
    `;

    return await this.executeAppleScript(script);
  }

  /**
   * List all notes from Apple Notes
   * @param {Object} options - Options for listing notes
   * @param {number} options.limit - Maximum number of notes to return (default: 50)
   * @returns {Array} Array of note objects with id, name, folder, creationDate, modificationDate
   */
  async list(options = {}) {
    const limit = options.limit || 50;

    const script = `
      tell application "Notes"
        set noteList to {}
        set noteCount to 0
        repeat with aNote in notes
          if noteCount >= ${limit} then exit repeat
          set noteId to id of aNote
          set noteName to name of aNote
          try
            set noteFolder to name of container of aNote
          on error
            set noteFolder to "Notes"
          end try
          set noteCreation to creation date of aNote as string
          set noteModification to modification date of aNote as string
          set end of noteList to noteId & "|||" & noteName & "|||" & noteFolder & "|||" & noteCreation & "|||" & noteModification
          set noteCount to noteCount + 1
        end repeat
        set AppleScript's text item delimiters to "###"
        return noteList as text
      end tell
    `;

    const result = await this.executeAppleScript(script);

    if (!result || result.trim() === '') {
      return [];
    }

    const notes = result.split('###').map(noteStr => {
      const [id, name, folder, creationDate, modificationDate] = noteStr.split('|||');
      return {
        id: id?.trim() || '',
        name: name?.trim() || '',
        folder: folder?.trim() || '',
        creationDate: creationDate?.trim() || '',
        modificationDate: modificationDate?.trim() || ''
      };
    }).filter(note => note.id && note.name);

    return notes;
  }

  /**
   * Get the content of a specific note by ID
   * @param {string} noteId - The ID of the note to retrieve
   * @returns {Object} Object with id, name, and body (content in markdown-like format)
   */
  async show(noteId) {
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Invalid note ID');
    }

    const escapedId = this.escapeForAppleScript(noteId);

    const script = `
      tell application "Notes"
        try
          set theNote to note id "${escapedId}"
          set noteId to id of theNote
          set noteName to name of theNote
          set noteBody to body of theNote
          return noteId & "|||" & noteName & "|||" & noteBody
        on error errMsg
          error "Note not found: " & errMsg
        end try
      end tell
    `;

    const result = await this.executeAppleScript(script);
    const [id, name, body] = result.split('|||');

    return {
      id: id?.trim() || '',
      name: name?.trim() || '',
      body: body?.trim() || ''
    };
  }

  /**
   * Update an existing note
   * @param {string} noteId - The ID of the note to update
   * @param {Object} updates - The updates to apply
   * @param {string} updates.title - New title (optional)
   * @param {string} updates.body - New body content (optional, supports markdown)
   * @returns {string} Success message
   */
  async update(noteId, updates = {}) {
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Invalid note ID');
    }

    if (!updates.title && !updates.body) {
      throw new Error('No updates provided. Specify title or body to update.');
    }

    const escapedId = this.escapeForAppleScript(noteId);

    let scriptParts = [];

    if (updates.title) {
      const validTitle = this.validateInput(updates.title, 'title');
      const escapedTitle = this.escapeForAppleScript(validTitle);
      scriptParts.push(`set name of theNote to "${escapedTitle}"`);
    }

    if (updates.body) {
      const htmlBody = this.convertToHTML(updates.body);
      const escapedBody = this.escapeForAppleScript(htmlBody);
      scriptParts.push(`set body of theNote to "${escapedBody}"`);
    }

    const script = `
      tell application "Notes"
        try
          set theNote to note id "${escapedId}"
          ${scriptParts.join('\n          ')}
          return "Note updated: " & name of theNote
        on error errMsg
          error "Note not found or update failed: " & errMsg
        end try
      end tell
    `;

    return await this.executeAppleScript(script);
  }

  /**
   * Convert HTML content from Apple Notes to Markdown
   * @param {string} html - HTML content from Apple Notes
   * @returns {string} Markdown formatted text
   */
  convertHTMLToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // Remove HTML comments
    md = md.replace(/<!--[\s\S]*?-->/g, '');

    // Headings
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n');
    md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n');

    // Bold and italic
    md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

    // Code blocks (blockquote with monospace)
    md = md.replace(/<blockquote[^>]*font-family:\s*monospace[^>]*>([\s\S]*?)<\/blockquote>/gi, '```\n$1\n```\n');

    // Inline code
    md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

    // Unordered lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
    });

    // Ordered lists
    let listCounter = 0;
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      listCounter = 0;
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
        listCounter++;
        return `${listCounter}. $1\n`;
      }) + '\n';
    });

    // Horizontal rules
    md = md.replace(/<hr[^>]*>/gi, '\n---\n\n');

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Paragraphs
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

    // Divs (just extract content)
    md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // Remove remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");

    // Clean up multiple newlines
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
  }

  /**
   * Create a new note
   * @param {string} title - The title of the note
   * @param {string} body - The body content (optional, supports markdown)
   * @param {Object} options - Additional options
   * @param {string} options.folder - The folder name to create the note in (optional)
   */
  async create(title, body = '', options = {}) {
    const validTitle = this.validateInput(title, 'title');
    const escapedTitle = this.escapeForAppleScript(validTitle);
    const htmlBody = body ? this.convertToHTML(body) : '';
    const escapedBody = this.escapeForAppleScript(htmlBody);

    let script;

    if (options.folder) {
      const escapedFolder = this.escapeForAppleScript(options.folder);
      script = `
        tell application "Notes"
          try
            set targetFolder to folder "${escapedFolder}"
            make new note at targetFolder with properties {name:"${escapedTitle}", body:"${escapedBody}"}
            return "Note created in folder '${escapedFolder}': ${escapedTitle}"
          on error errMsg
            error "Folder '${escapedFolder}' not found. Use 'folders list' to see available folders."
          end try
        end tell
      `;
    } else {
      script = `
        tell application "Notes"
          make new note with properties {name:"${escapedTitle}", body:"${escapedBody}"}
          return "Note created: ${escapedTitle}"
        end tell
      `;
    }

    return await this.executeAppleScript(script);
  }
}

module.exports = NotesCore;
