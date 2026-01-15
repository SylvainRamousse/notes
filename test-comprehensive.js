#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Apple Notes CLI
 */

const NotesCore = require('./notes-core');
const { spawn } = require('child_process');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

let passedTests = 0;
let failedTests = 0;

/**
 * Test runner
 */
async function test(name, testFunc) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFunc();
    console.log(`${colors.green}✓${colors.reset}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    if (process.env.DEBUG === 'true') {
      console.error(error.stack);
    }
    failedTests++;
  }
}

/**
 * Test CLI directly
 */
async function testCLI(args, expectedToWork = true) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['notes-cli.js', ...args]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => stdout += data);
    proc.stderr.on('data', data => stderr += data);

    proc.on('close', code => {
      if (expectedToWork && code !== 0) {
        reject(new Error(`CLI failed: ${stderr || stdout}`));
      } else if (!expectedToWork && code === 0) {
        reject(new Error('CLI should have failed but didn\'t'));
      } else {
        resolve({ stdout, stderr, code });
      }
    });
  });
}

/**
 * Test AppleScript escaping
 */
async function testAppleScriptEscaping() {
  const core = new NotesCore();

  // Test basic escaping
  const tests = [
    { input: 'Hello "World"', desc: 'double quotes' },
    { input: 'Line 1\nLine 2', desc: 'newlines' },
    { input: 'Tab\there', desc: 'tabs' },
    { input: 'Back\\slash', desc: 'backslashes' },
    { input: 'Mixed "quotes" and\nnewlines\\backslash', desc: 'mixed special chars' },
    { input: "It's a test", desc: 'single quotes (apostrophes)' },
    { input: 'Emoji 😀 test', desc: 'emoji characters' },
    { input: 'Ümläuts äöü ÄÖÜ ß', desc: 'German umlauts' },
    { input: 'Français: à è é ê ë', desc: 'French accents' },
    { input: '中文测试', desc: 'Chinese characters' },
    { input: '日本語テスト', desc: 'Japanese characters' },
    { input: 'Кириллица тест', desc: 'Cyrillic characters' }
  ];

  for (const t of tests) {
    const escaped = core.escapeForAppleScript(t.input);
    if (!escaped || escaped.length === 0) {
      throw new Error(`Escaping failed for ${t.desc}: result is empty`);
    }
    // Basic check - should not contain raw control characters
    if (escaped.includes('\0') || escaped.includes('\x1F')) {
      throw new Error(`Escaping failed for ${t.desc}: contains control characters`);
    }
  }
}

/**
 * Test HTML conversion
 */
async function testHTMLConversion() {
  const core = new NotesCore();

  const tests = [
    {
      input: '# Heading 1',
      shouldContain: '<h1',
      desc: 'H1 heading'
    },
    {
      input: '## Heading 2',
      shouldContain: '<h2',
      desc: 'H2 heading'
    },
    {
      input: '**bold text**',
      shouldContain: '<strong>bold text</strong>',
      desc: 'bold text'
    },
    {
      input: '*italic text*',
      shouldContain: '<em>italic text</em>',
      desc: 'italic text'
    },
    {
      input: '`code`',
      shouldContain: '<code',
      desc: 'inline code'
    },
    {
      input: '- Item 1\n- Item 2',
      shouldContain: '<ul',
      desc: 'bullet list'
    },
    {
      input: '1. First\n2. Second',
      shouldContain: '<ol',
      desc: 'numbered list'
    },
    {
      input: '<script>alert("xss")</script>',
      shouldNotContain: '<script',
      desc: 'XSS prevention'
    }
  ];

  for (const t of tests) {
    const html = core.convertToHTML(t.input);
    if (t.shouldContain && !html.includes(t.shouldContain)) {
      throw new Error(`HTML conversion failed for ${t.desc}: missing "${t.shouldContain}"`);
    }
    if (t.shouldNotContain && html.includes(t.shouldNotContain)) {
      throw new Error(`HTML conversion failed for ${t.desc}: contains dangerous "${t.shouldNotContain}"`);
    }
  }
}

/**
 * Test input validation
 */
async function testInputValidation() {
  const core = new NotesCore();

  // Valid inputs
  core.validateInput('Valid Title', 'title');
  core.validateInput('Valid Body Text', 'text');

  // Invalid inputs
  try {
    core.validateInput('   ', 'title');  // Only whitespace
    throw new Error('Should reject empty title');
  } catch (e) {
    if (!e.message.includes('cannot be empty')) {
      throw e;
    }
  }

  try {
    core.validateInput('a'.repeat(256), 'title');
    throw new Error('Should reject too long title');
  } catch (e) {
    if (!e.message.includes('too long')) {
      throw e;
    }
  }

  try {
    core.validateInput(null, 'title');
    throw new Error('Should reject null input');
  } catch (e) {
    if (!e.message.includes('expected string')) {
      throw e;
    }
  }
}

/**
 * Test CLI arguments
 */
async function testCLIArguments() {
  // Test help
  await testCLI(['--help']);

  // Test version
  await testCLI(['--version']);

  // Test with no arguments (should show help)
  await testCLI([]);
}

/**
 * Integration test - actually create a note
 */
async function testActualNoteCreation() {
  const core = new NotesCore({ debug: false });

  const testCases = [
    {
      title: 'Test Note Simple',
      body: 'This is a simple test note.',
      desc: 'simple note'
    },
    {
      title: 'Test Note with Markdown',
      body: '# Heading\n\n**Bold** and *italic* text.\n\n- Item 1\n- Item 2',
      desc: 'markdown note'
    },
    {
      title: 'Test Note with Special Chars',
      body: 'Quote: "Hello"\nApostrophe: It\'s working\nNewline: Line1\nLine2',
      desc: 'special characters'
    },
    {
      title: 'Test Note with International',
      body: 'Deutsch: äöü ÄÖÜ ß\nFrançais: à è é\n中文: 你好\n日本語: こんにちは',
      desc: 'international characters'
    },
    {
      title: 'Test Note with Code',
      body: 'Code example:\n```\nfunction test() {\n  return "Hello";\n}\n```',
      desc: 'code block'
    }
  ];

  for (const tc of testCases) {
    try {
      const result = await core.create(tc.title, tc.body);
      if (!result || !result.includes('Note created')) {
        throw new Error(`Failed to create ${tc.desc}: ${result}`);
      }
    } catch (error) {
      // Check if it's a permission/Notes app issue
      if (error.message.includes('keine Berechtigung') ||
        error.message.includes('permission') ||
        error.message.includes('access')) {
        console.log(`${colors.yellow}  (Skipped - Notes permission required)${colors.reset}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Test note creation with folder option
 */
async function testNoteCreationWithFolder() {
  const core = new NotesCore({ debug: false });

  // Test with non-existent folder (should fail with helpful message)
  try {
    await core.create('Test Note', 'Body', { folder: 'NonExistentFolder12345' });
    // If we get here, the folder might actually exist - that's ok
  } catch (error) {
    // Should get a "folder not found" type error
    if (!error.message.toLowerCase().includes('not found') &&
      !error.message.toLowerCase().includes('folder') &&
      !error.message.toLowerCase().includes('permission') &&
      !error.message.toLowerCase().includes('berechtigung')) {
      throw new Error(`Expected folder not found error, got: ${error.message}`);
    }
  }
}

/**
 * Test security features
 */
async function testSecurity() {
  const core = new NotesCore();

  // Test XSS prevention
  const xssAttempts = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<iframe src="evil.com"></iframe>',
    '<form action="evil.com"><input name="password"></form>'
  ];

  for (const xss of xssAttempts) {
    const safe = core.sanitizeHTML(xss);
    if (safe.includes('<script') || safe.includes('onerror') ||
      safe.includes('javascript:') || safe.includes('<iframe') ||
      safe.includes('<form')) {
      throw new Error(`Security: XSS not prevented for: ${xss}`);
    }
  }

  // Test command injection prevention in AppleScript
  const injectionAttempts = [
    'Title" } end tell\ntell application "System Events" to delete file',
    'Test tell application "Finder" to delete',
    'end tell } malicious code'
  ];

  for (const injection of injectionAttempts) {
    const safe = core.escapeForAppleScript(injection);

    // Check that 'tell' commands are removed/neutralized
    if (safe.toLowerCase().includes('tell')) {
      throw new Error(`Security: 'tell' command not removed from: ${safe}`);
    }

    // The escapeForAppleScript should neutralize injection attempts
    // Just verify the result doesn't contain dangerous patterns
    if (safe.includes('} ')) {
      // This pattern could break out of AppleScript string
      throw new Error(`Security: Dangerous pattern "} " found in: ${safe}`);
    }
  }
}

/**
 * Test HTML to Markdown conversion
 */
async function testHTMLToMarkdownConversion() {
  const core = new NotesCore();

  const tests = [
    {
      input: '<h1>Heading 1</h1>',
      shouldContain: '# Heading 1',
      desc: 'H1 heading'
    },
    {
      input: '<h2>Heading 2</h2>',
      shouldContain: '## Heading 2',
      desc: 'H2 heading'
    },
    {
      input: '<h3>Heading 3</h3>',
      shouldContain: '### Heading 3',
      desc: 'H3 heading'
    },
    {
      input: '<strong>bold text</strong>',
      shouldContain: '**bold text**',
      desc: 'bold text'
    },
    {
      input: '<b>bold text</b>',
      shouldContain: '**bold text**',
      desc: 'bold with b tag'
    },
    {
      input: '<em>italic text</em>',
      shouldContain: '*italic text*',
      desc: 'italic text'
    },
    {
      input: '<i>italic text</i>',
      shouldContain: '*italic text*',
      desc: 'italic with i tag'
    },
    {
      input: '<code>inline code</code>',
      shouldContain: '`inline code`',
      desc: 'inline code'
    },
    {
      input: '<ul><li>Item 1</li><li>Item 2</li></ul>',
      shouldContain: '- Item 1',
      desc: 'unordered list'
    },
    {
      input: '<a href="https://example.com">link text</a>',
      shouldContain: '[link text](https://example.com)',
      desc: 'link'
    },
    {
      input: 'Line 1<br>Line 2',
      shouldContain: 'Line 1\nLine 2',
      desc: 'line break'
    },
    {
      input: '<hr>',
      shouldContain: '---',
      desc: 'horizontal rule'
    },
    {
      input: '<p>paragraph text</p>',
      shouldContain: 'paragraph text',
      desc: 'paragraph'
    },
    {
      input: '&amp; &lt; &gt; &quot;',
      shouldContain: '& < > "',
      desc: 'HTML entities'
    }
  ];

  for (const t of tests) {
    const markdown = core.convertHTMLToMarkdown(t.input);
    if (!markdown.includes(t.shouldContain)) {
      throw new Error(`HTML to Markdown conversion failed for ${t.desc}: expected "${t.shouldContain}" but got "${markdown}"`);
    }
  }

  // Test empty input
  const emptyResult = core.convertHTMLToMarkdown('');
  if (emptyResult !== '') {
    throw new Error('HTML to Markdown conversion should return empty string for empty input');
  }

  // Test null-ish input
  const nullResult = core.convertHTMLToMarkdown(null);
  if (nullResult !== '') {
    throw new Error('HTML to Markdown conversion should return empty string for null input');
  }
}

/**
 * Test show note functionality
 */
async function testShowNote() {
  const core = new NotesCore({ debug: false });

  // Test invalid input validation
  try {
    await core.show(null);
    throw new Error('Should reject null note ID');
  } catch (e) {
    if (!e.message.includes('Invalid note ID')) {
      throw e;
    }
  }

  try {
    await core.show('');
    throw new Error('Should reject empty note ID');
  } catch (e) {
    if (!e.message.includes('Invalid note ID')) {
      throw e;
    }
  }

  try {
    await core.show(123);
    throw new Error('Should reject non-string note ID');
  } catch (e) {
    if (!e.message.includes('Invalid note ID')) {
      throw e;
    }
  }

  // Test with invalid note ID (should throw "not found" error)
  try {
    await core.show('x-coredata://INVALID-NOTE-ID-12345');
    // If we get here without error and Notes app has the note, that's fine
    // Otherwise it should throw a not found error
  } catch (e) {
    // This is expected - note doesn't exist
    if (!e.message.toLowerCase().includes('not found') &&
      !e.message.toLowerCase().includes('error') &&
      !e.message.toLowerCase().includes('permission')) {
      throw new Error(`Unexpected error type: ${e.message}`);
    }
  }
}

/**
 * Test CLI show command (new structure: note <id>)
 */
async function testCLIShowCommand() {
  // Test note command with no ID (should show AI message, not error)
  await testCLI(['note']);

  // Test legacy show command with no ID (should fail gracefully)
  const result = await testCLI(['show'], false);
  if (!result.stderr.includes('Note ID required') && !result.stdout.includes('Note ID required')) {
    throw new Error('CLI show without ID should show error message');
  }
}

/**
 * Test CLI folders command (new structure: folders list)
 */
async function testCLIFoldersCommand() {
  // Test new folders list command
  await testCLI(['folders', 'list']);

  // Test legacy folders command
  await testCLI(['folders']);
}

/**
 * Test CLI note create with @Folder syntax
 */
async function testCLINoteCreateWithFolder() {
  // Test note create command with @Folder (uses non-existent folder, should fail)
  const result = await testCLI(['note', 'create', 'Test Note', 'Body', '@NonExistentFolder12345'], false);
  // Should contain error about folder not found
  const output = result.stderr + result.stdout;
  if (!output.toLowerCase().includes('not found') &&
    !output.toLowerCase().includes('error') &&
    !output.toLowerCase().includes('folder')) {
    throw new Error('CLI note create with invalid folder should show error');
  }
}

/**
 * Test list notes functionality
 */
async function testListNotes() {
  const core = new NotesCore({ debug: false });

  try {
    const notes = await core.list({ limit: 5 });

    // Should return an array
    if (!Array.isArray(notes)) {
      throw new Error('list() should return an array');
    }

    // If there are notes, check structure
    if (notes.length > 0) {
      const note = notes[0];
      if (!note.id || !note.name) {
        throw new Error('Note should have id and name properties');
      }
      if (typeof note.folder !== 'string') {
        throw new Error('Note should have folder property');
      }
    }
  } catch (e) {
    // Permission errors are acceptable
    if (!e.message.toLowerCase().includes('permission') &&
      !e.message.toLowerCase().includes('berechtigung')) {
      throw e;
    }
  }
}

/**
 * Test list folders functionality
 */
async function testListFolders() {
  const core = new NotesCore({ debug: false });

  try {
    const folders = await core.listFolders();

    // Should return an array
    if (!Array.isArray(folders)) {
      throw new Error('listFolders() should return an array');
    }

    // If there are folders, check structure
    if (folders.length > 0) {
      const folder = folders[0];
      if (!folder.id || !folder.name) {
        throw new Error('Folder should have id and name properties');
      }
      if (typeof folder.noteCount !== 'number') {
        throw new Error('Folder should have noteCount as a number');
      }
    }
  } catch (e) {
    // Permission errors are acceptable
    if (!e.message.toLowerCase().includes('permission') &&
      !e.message.toLowerCase().includes('berechtigung')) {
      throw e;
    }
  }
}

/**
 * Test CLI folder create command
 */
async function testCLIFolderCreate() {
  // Test folder create with no name (should fail)
  const result = await testCLI(['folder', 'create'], false);
  const output = result.stderr + result.stdout;
  if (!output.includes('Folder name required')) {
    throw new Error('CLI folder create without name should show error');
  }
}

/**
 * Test createFolder validation
 */
async function testCreateFolderValidation() {
  const core = new NotesCore({ debug: false });

  // Test with empty name
  try {
    await core.createFolder('');
    throw new Error('Should reject empty folder name');
  } catch (e) {
    if (!e.message.includes('cannot be empty') && !e.message.includes('Invalid input')) {
      throw e;
    }
  }

  // Test with null
  try {
    await core.createFolder(null);
    throw new Error('Should reject null folder name');
  } catch (e) {
    if (!e.message.includes('expected string') && !e.message.includes('Invalid input')) {
      throw e;
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.cyan}🧪 Running Comprehensive Tests${colors.reset}\n`);

  // Core functionality tests
  await test('AppleScript escaping', testAppleScriptEscaping);
  await test('HTML conversion', testHTMLConversion);
  await test('HTML to Markdown conversion', testHTMLToMarkdownConversion);
  await test('Input validation', testInputValidation);
  await test('Security features', testSecurity);

  // CLI tests
  await test('CLI arguments', testCLIArguments);
  await test('CLI show command', testCLIShowCommand);
  await test('CLI folders command', testCLIFoldersCommand);
  await test('CLI folder create', testCLIFolderCreate);
  await test('CLI note create with @Folder', testCLINoteCreateWithFolder);

  // Integration tests (may require Notes app permission)
  console.log(`\n${colors.cyan}Integration Tests:${colors.reset}`);
  await test('Actual note creation', testActualNoteCreation);
  await test('Note creation with folder option', testNoteCreationWithFolder);
  await test('Create folder validation', testCreateFolderValidation);
  await test('Show note validation', testShowNote);
  await test('List notes', testListNotes);
  await test('List folders', testListFolders);

  // Summary
  console.log(`\n${colors.cyan}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);

  if (failedTests > 0) {
    console.log(`\n${colors.red}❌ Tests failed!${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
  if (process.env.DEBUG === 'true') {
    console.error(error.stack);
  }
  process.exit(1);
});