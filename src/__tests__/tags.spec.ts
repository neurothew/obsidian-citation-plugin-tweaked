import {
  EntryCSLAdapter,
  EntryDataCSL,
  EntryBibLaTeXAdapter,
  Library,
  loadEntries,
} from '../types';

test('renders Zotero tags from CSL keyword when present', () => {
  const entry: EntryDataCSL = {
    id: 'test-key',
    type: 'article-journal',
    title: 'Tagged paper',
    keyword: 'memory, EEG, speech tracking',
  };
  const library = new Library({
    [entry.id]: new EntryCSLAdapter(entry),
  });

  const variables = library.getTemplateVariablesForCitekey(entry.id);

  expect(variables.tags).toEqual(['memory', 'EEG', 'speech tracking']);
  expect(variables.tagString).toBe('memory, EEG, speech tracking');
});

test('renders Zotero tags from BibLaTeX keywords', () => {
  const entries = loadEntries(
    [
      '@article{test-key,',
      '  title = {Tagged paper},',
      '  keywords = {memory, EEG, speech tracking},',
      '}',
    ].join('\n'),
    'biblatex',
  );
  const library = new Library({
    'test-key': new EntryBibLaTeXAdapter(entries[0] as any),
  });

  const variables = library.getTemplateVariablesForCitekey('test-key');

  expect(variables.tags).toEqual(['memory', 'EEG', 'speech tracking']);
  expect(variables.tagString).toBe('memory, EEG, speech tracking');
});

test('renders human-readable item type from BibLaTeX type', () => {
  const entries = loadEntries(
    [
      '@inproceedings{test-key,',
      '  title = {Conference paper},',
      '}',
    ].join('\n'),
    'biblatex',
  );
  const library = new Library({
    'test-key': new EntryBibLaTeXAdapter(entries[0] as any),
  });

  const variables = library.getTemplateVariablesForCitekey('test-key');

  expect(variables.type).toBe('inproceedings');
  expect(variables.itemType).toBe('Conference Paper');
});

test('recognizes arXiv BibLaTeX online entries as preprints', () => {
  const entries = loadEntries(
    [
      '@online{test-key,',
      '  title = {Preprint paper},',
      '  url = {https://arxiv.org/abs/1234.5678},',
      '  eprint = {1234.5678},',
      '  eprinttype = {arxiv},',
      '}',
    ].join('\n'),
    'biblatex',
  );
  const library = new Library({
    'test-key': new EntryBibLaTeXAdapter(entries[0] as any),
  });

  const variables = library.getTemplateVariablesForCitekey('test-key');

  expect(variables.type).toBe('online');
  expect(variables.itemType).toBe('Preprint');
  expect(variables.repository).toBe('arXiv');
  expect(variables.containerTitle).toBe('arXiv');
});

test('keeps ordinary BibLaTeX online entries as web pages', () => {
  const entries = loadEntries(
    [
      '@online{test-key,',
      '  title = {Project page},',
      '  url = {https://example.com},',
      '}',
    ].join('\n'),
    'biblatex',
  );
  const library = new Library({
    'test-key': new EntryBibLaTeXAdapter(entries[0] as any),
  });

  const variables = library.getTemplateVariablesForCitekey('test-key');

  expect(variables.type).toBe('online');
  expect(variables.itemType).toBe('Web Page');
  expect(variables.repository).toBeNull();
});

test('recognizes CSL entries from preprint sources as preprints', () => {
  const entry: EntryDataCSL = {
    id: 'test-key',
    type: 'article-journal',
    title: 'Preprint paper',
    source: 'arXiv.org',
    URL: 'https://arxiv.org/abs/1234.5678',
  };
  const library = new Library({
    [entry.id]: new EntryCSLAdapter(entry),
  });

  const variables = library.getTemplateVariablesForCitekey(entry.id);

  expect(variables.type).toBe('article-journal');
  expect(variables.itemType).toBe('Preprint');
  expect(variables.repository).toBe('arXiv');
  expect(variables.containerTitle).toBe('arXiv');
});
