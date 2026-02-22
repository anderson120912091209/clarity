/**
 * Filesystem Tools Prompt
 *
 * Instructions for the agent on how to use file creation and deletion tools.
 */

export function getFilesystemToolsPrompt(): string {
  return [
    'File Management:',
    '- Use `create_file` to create new files. Provide the full relative path and content.',
    '- Use `create_folder` to create new directories for organizing files.',
    '- Use `delete_file` to remove files that are no longer needed.',
    '- All create/delete operations are staged for user approval before being committed.',
    '- After creating a file, you can immediately edit it with `apply_file_edit` in the same turn.',
    '- If a file already exists, use `apply_file_edit` instead of `create_file`.',
    '- When building multi-file structures, create folders first, then files.',
    '- Use `\\input{}` (LaTeX) or `#import` (Typst) to connect files across the project.',
  ].join('\n')
}
