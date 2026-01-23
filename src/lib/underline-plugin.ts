import { $markSchema, $command } from '@milkdown/utils';
import { toggleMark } from '@milkdown/prose/commands';

// Define the underline mark schema
// Using HTML <u> tags since underline isn't part of standard markdown
// Note: Underlines will work in the editor but aren't preserved in markdown export
// since underline isn't a standard markdown feature
export const underlineSchema = $markSchema('underline', (ctx) => ({
  parseDOM: [
    { tag: 'u' },
    {
      style: 'text-decoration',
      getAttrs: (value) => (value === 'underline') as false,
    },
  ],
  toDOM: () => ['u', 0] as const,
  // Since underline isn't standard markdown, we output as HTML inline
  parseMarkdown: {
    match: () => false, // Don't parse from markdown (no underline in markdown)
    runner: () => {}, // No-op
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'underline',
    runner: (state, mark) => {
      // Use withMark to handle the mark properly
      // This outputs the text wrapped in HTML tags
      state.withMark(mark, 'html', undefined, {
        value: '<u>',
      });
    },
  },
}));

// Create the toggle underline command
export const toggleUnderlineCommand = $command('ToggleUnderline', (ctx) => {
  return () => toggleMark(underlineSchema.type(ctx));
});

// Export the plugin as an array to be used with .use()
export const underline = [underlineSchema, toggleUnderlineCommand].flat();
