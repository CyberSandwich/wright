import { $markSchema, $command } from '@milkdown/utils';
import { toggleMark } from '@milkdown/prose/commands';

// Define the underline mark schema
// Using HTML <u> tags since underline isn't part of standard markdown
// Underlines are preserved in the editor but may not export to pure markdown
export const underlineSchema = $markSchema('underline', (ctx) => ({
  parseDOM: [
    { tag: 'u' },
    {
      style: 'text-decoration',
      getAttrs: (value) => (value === 'underline') ? null : false,
    },
  ],
  toDOM: () => ['u', 0] as const,
  // Underline isn't standard markdown, but we handle it gracefully
  parseMarkdown: {
    match: () => false, // Don't parse from markdown (underline not in standard markdown)
    runner: () => {}, // No-op
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'underline',
    runner: (state, mark, node) => {
      // For underline, we just output the text content without special markers
      // The underline formatting is preserved in the editor but stripped in plain markdown export
      // This prevents literal <u> tags from appearing in the markdown
      state.next(node.content);
    },
  },
}));

// Create the toggle underline command
export const toggleUnderlineCommand = $command('ToggleUnderline', (ctx) => {
  return () => toggleMark(underlineSchema.type(ctx));
});

// Export the plugin as an array to be used with .use()
export const underline = [underlineSchema, toggleUnderlineCommand].flat();
