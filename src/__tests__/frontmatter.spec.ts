import { refreshTemplateFrontmatter } from '../frontmatter';

describe('refreshTemplateFrontmatter', () => {
  it('updates template fields without changing custom properties or note text', () => {
    const existing =
      '---\n' +
      'title: "Old title"\n' +
      'authors:\n' +
      '  - "Old Author"\n' +
      'year: 2020\n' +
      'rating: 5\n' +
      '---\n' +
      '\n' +
      '# My notes\n';
    const refreshed =
      '---\n' +
      'title: "New title"\n' +
      'authors:\n' +
      '  - "New Author"\n' +
      'year: 2026\n' +
      'tags:\n' +
      '  - refreshed\n' +
      '---\n';

    expect(refreshTemplateFrontmatter(existing, refreshed)).toBe(
      '---\n' +
        'title: "New title"\n' +
        'authors:\n' +
        '  - "New Author"\n' +
        'year: 2026\n' +
        'rating: 5\n' +
        'tags:\n' +
        '  - refreshed\n' +
        '---\n' +
        '\n' +
        '# My notes\n',
    );
  });

  it('requires frontmatter in both the note and the template', () => {
    expect(refreshTemplateFrontmatter('# Note\n', '---\ntitle: Test\n---\n')).toBeNull();
    expect(refreshTemplateFrontmatter('---\ntitle: Test\n---\n', '# Note\n')).toBeNull();
  });
});
