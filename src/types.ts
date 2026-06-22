import * as BibTeXParser from '@retorquere/bibtex-parser';
import { Entry as EntryDataBibLaTeX } from '@retorquere/bibtex-parser';
// Also make EntryDataBibLaTeX available to other modules
export { Entry as EntryDataBibLaTeX } from '@retorquere/bibtex-parser';

// Trick: allow string indexing onto object properties
export interface IIndexable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const databaseTypes = ['csl-json', 'biblatex'] as const;
export type DatabaseType = typeof databaseTypes[number];

const ENTRY_TYPE_LABELS: Record<string, string> = {
  article: 'Journal Article',
  'article-journal': 'Journal Article',
  'article-magazine': 'Magazine Article',
  'article-newspaper': 'Newspaper Article',
  book: 'Book',
  chapter: 'Book Section',
  collection: 'Edited Book',
  inbook: 'Book Section',
  incollection: 'Book Section',
  inproceedings: 'Conference Paper',
  manuscript: 'Manuscript',
  misc: 'Miscellaneous',
  online: 'Web Page',
  paper: 'Conference Paper',
  'paper-conference': 'Conference Paper',
  phdthesis: 'Thesis',
  preprint: 'Preprint',
  proceedings: 'Conference Proceedings',
  report: 'Report',
  techreport: 'Report',
  thesis: 'Thesis',
  unpublished: 'Manuscript',
  webpage: 'Web Page',
};

const PREPRINT_MARKER_RE = /\b(arxiv|bio\s*rxiv|biorxiv|med\s*rxiv|medrxiv|psyarxiv|preprint)\b/i;

function firstFieldValue(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function hasPreprintMarker(...values: Array<string | string[]>): boolean {
  return values
    .map(firstFieldValue)
    .some((value) => value && PREPRINT_MARKER_RE.test(value));
}

function labelForEntryType(type: string): string {
  return ENTRY_TYPE_LABELS[type] || type;
}

function normalizeRepositoryName(rawRepository?: string): string {
  if (!rawRepository) return null;

  const compact = rawRepository.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'arxiv') return 'arXiv';
  if (compact === 'biorxiv') return 'bioRxiv';
  if (compact === 'medrxiv') return 'medRxiv';
  if (compact === 'psyarxiv') return 'PsyArXiv';

  return rawRepository;
}

export const TEMPLATE_VARIABLES = {
  citekey: 'Unique citekey',
  abstract: '',
  authors: 'List of author name objects with given and family fields',
  authorString: 'Comma-separated list of author names',
  containerTitle:
    'Title of the container holding the reference (e.g. book title for a book chapter, or the journal title for a journal article)',
  DOI: '',
  eprint: '',
  eprinttype: '',
  eventPlace: 'Location of event',
  itemType: 'Human-readable item type, such as Journal Article or Conference Paper',
  note: '',
  page: 'Page or page range',
  publisher: '',
  publisherPlace: 'Location of publisher',
  repository: 'Preprint repository, such as arXiv, bioRxiv, or medRxiv',
  title: '',
  titleShort: '',
  tags: 'Zotero tags/keywords as a list',
  tagString: 'Comma-separated Zotero tags/keywords',
  type: 'Entry type, such as article-journal, paper-conference, book, or chapter',
  URL: '',
  year: 'Publication year',
  zoteroSelectURI: 'URI to open the reference in Zotero',
};

export class Library {
  constructor(public entries: { [citekey: string]: Entry }) {}

  get size(): number {
    return Object.keys(this.entries).length;
  }

  /**
   * For the given citekey, find the corresponding `Entry` and return a
   * collection of template variable assignments.
   */
  getTemplateVariablesForCitekey(citekey: string): Record<string, any> {
    const entry: Entry = this.entries[citekey];
    const shortcuts = {
      citekey: citekey,

      abstract: entry.abstract,
      authors: entry.author,
      authorString: entry.authorString,
      containerTitle: entry.containerTitle,
      DOI: entry.DOI,
      eprint: entry.eprint,
      eprinttype: entry.eprinttype,
      eventPlace: entry.eventPlace,
      itemType: entry.itemType,
      note: entry.note,
      page: entry.page,
      publisher: entry.publisher,
      publisherPlace: entry.publisherPlace,
      repository: entry.repository,
      title: entry.title,
      titleShort: entry.titleShort,
      tags: entry.tags,
      tagString: entry.tagString,
      type: entry.type,
      URL: entry.URL,
      year: entry.year?.toString(),
      zoteroSelectURI: entry.zoteroSelectURI,
    };

    return { entry: entry.toJSON(), ...shortcuts };
  }
}

/**
 * Load reference entries from the given raw database data.
 *
 * Returns a list of `EntryData`, which should be wrapped with the relevant
 * adapter and used to instantiate a `Library`.
 */
export function loadEntries(
  databaseRaw: string,
  databaseType: DatabaseType,
): EntryData[] {
  let libraryArray: EntryData[];

  if (databaseType == 'csl-json') {
    libraryArray = JSON.parse(databaseRaw);
  } else if (databaseType == 'biblatex') {
    const options: BibTeXParser.ParserOptions = {
      errorHandler: (err) => {
        console.warn(
          'Citation plugin: non-fatal error loading BibLaTeX entry:',
          err,
        );
      },
    };

    const parsed = BibTeXParser.parse(
      databaseRaw,
      options,
    ) as BibTeXParser.Bibliography;

    parsed.errors.forEach((error) => {
      console.error(
        `Citation plugin: fatal error loading BibLaTeX entry` +
          ` (line ${error.line}, column ${error.column}):`,
        error.message,
      );
    });

    libraryArray = parsed.entries;
  }

  return libraryArray;
}

export interface Author {
  given?: string;
  family?: string;
}

function normalizeTags(rawTags?: string | string[]): string[] {
  if (!rawTags) return null;

  const values = Array.isArray(rawTags) ? rawTags : [rawTags];
  const tags = values
    .reduce((all: string[], value: string) => {
      if (!value) return all;
      return all.concat(value.split(','));
    }, [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return tags.length > 0 ? Array.from(new Set(tags)) : null;
}

/**
 * An `Entry` represents a single reference in a reference database.
 * Each entry has a unique identifier, known in most reference managers as its
 * "citekey."
 */
export abstract class Entry {
  /**
   * Unique identifier for the entry (also the citekey).
   */
  public abstract id: string;

  public abstract type: string;

  public get itemType(): string {
    return labelForEntryType(this.type);
  }

  public abstract abstract?: string;
  public abstract author?: Author[];

  /**
   * A comma-separated list of authors, each of the format `<firstname> <lastname>`.
   */
  public abstract authorString?: string;

  /**
   * The name of the container for this reference -- in the case of a book
   * chapter reference, the name of the book; in the case of a journal article,
   * the name of the journal.
   */
  public abstract containerTitle?: string;

  public abstract DOI?: string;
  public abstract files?: string[];

  /**
   * The date of issue. Many references do not contain information about month
   * and day of issue; in this case, the `issuedDate` will contain dummy minimum
   * values for those elements. (A reference which is only encoded as being
   * issued in 2001 is represented here with a date 2001-01-01 00:00:00 UTC.)
   */
  public abstract issuedDate?: Date;

  /**
   * Page or page range of the reference.
   */
  public abstract page?: string;
  public abstract tags?: string[];
  public abstract title?: string;
  public abstract titleShort?: string;
  public abstract URL?: string;

  public abstract eventPlace?: string;

  public abstract publisher?: string;
  public abstract publisherPlace?: string;
  public abstract repository?: string;

  /**
   * BibLaTeX-specific properties
   */
  public abstract eprint?: string;
  public abstract eprinttype?: string;

  protected _year?: string;
  public get year(): number {
    return this._year
      ? parseInt(this._year)
      : this.issuedDate?.getUTCFullYear();
  }

  protected _note?: string[];

  public get note(): string {
    return this._note
      ?.map((el) => el.replace(/(zotero:\/\/.+)/g, '[Link]($1)'))
      .join('\n\n');
  }

  public get tagString(): string {
    return this.tags?.join(', ');
  }

  /**
   * A URI which will open the relevant entry in the Zotero client.
   */
  public get zoteroSelectURI(): string {
    return `zotero://select/items/@${this.id}`;
  }

  toJSON(): Record<string, unknown> {
    const jsonObj: Record<string, unknown> = Object.assign({}, this);

    // add getter values
    const proto = Object.getPrototypeOf(this);
    Object.entries(Object.getOwnPropertyDescriptors(proto))
      .filter(([, descriptor]) => typeof descriptor.get == 'function')
      .forEach(([key, descriptor]) => {
        if (descriptor && key[0] !== '_') {
          try {
            const val = (this as IIndexable)[key];
            jsonObj[key] = val;
          } catch (error) {
            return;
          }
        }
      });

    return jsonObj;
  }
}

export type EntryData = EntryDataCSL | EntryDataBibLaTeX;

export interface EntryDataCSL {
  id: string;
  type: string;

  abstract?: string;
  author?: Author[];
  'container-title'?: string;
  DOI?: string;
  'event-place'?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issued?: { 'date-parts': [any[]] };
  page?: string;
  publisher?: string;
  'publisher-place'?: string;
  genre?: string;
  keyword?: string | string[];
  source?: string;
  title?: string;
  'title-short'?: string;
  URL?: string;
}

export class EntryCSLAdapter extends Entry {
  constructor(private data: EntryDataCSL) {
    super();
  }

  eprint: string = null;
  eprinttype: string = null;
  files: string[] = null;

  get repository() {
    if (hasPreprintMarker(this.data.source)) {
      return normalizeRepositoryName(this.data.source.replace(/\.org$/i, ''));
    }
    if (hasPreprintMarker(this.data.genre)) {
      return normalizeRepositoryName(this.data.genre);
    }
    if (hasPreprintMarker(this.data['container-title'])) {
      return normalizeRepositoryName(
        this.data['container-title'].split(':')[0],
      );
    }
    if (hasPreprintMarker(this.data.URL)) {
      const match = this.data.URL.match(PREPRINT_MARKER_RE);
      return normalizeRepositoryName(match?.[0]);
    }

    return null;
  }

  get id() {
    return this.data.id;
  }
  get type() {
    return this.data.type;
  }

  get itemType(): string {
    if (
      hasPreprintMarker(
        this.data.genre,
        this.data.source,
        this.data['container-title'],
        this.data.URL,
      )
    ) {
      return 'Preprint';
    }

    return labelForEntryType(this.type);
  }

  get abstract() {
    return this.data.abstract;
  }
  get author() {
    return this.data.author;
  }

  get authorString(): string | null {
    return this.data.author
      ? this.data.author.map((a) => `${a.given} ${a.family}`).join(', ')
      : null;
  }

  get containerTitle() {
    if (this.itemType === 'Preprint' && this.repository) {
      return this.repository;
    }

    return this.data['container-title'] || this.repository;
  }

  get DOI() {
    return this.data.DOI;
  }

  get eventPlace() {
    return this.data['event-place'];
  }

  get issuedDate() {
    if (
      !(
        this.data.issued &&
        this.data.issued['date-parts'] &&
        this.data.issued['date-parts'][0].length > 0
      )
    )
      return null;

    const [year, month, day] = this.data.issued['date-parts'][0];
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  }

  get page() {
    return this.data.page;
  }

  get tags() {
    return normalizeTags(this.data.keyword);
  }

  get publisher() {
    return this.data.publisher;
  }

  get publisherPlace() {
    return this.data['publisher-place'];
  }

  get title() {
    return this.data.title;
  }

  get titleShort() {
    return this.data['title-short'];
  }

  get URL() {
    return this.data.URL;
  }
}

const BIBLATEX_PROPERTY_MAPPING: Record<string, string> = {
  abstract: 'abstract',
  booktitle: '_containerTitle',
  date: 'issued',
  doi: 'DOI',
  eprint: 'eprint',
  eprinttype: 'eprinttype',
  eventtitle: 'event',
  journal: '_containerTitle',
  journaltitle: '_containerTitle',
  location: 'publisherPlace',
  pages: 'page',
  shortjournal: 'containerTitleShort',
  title: 'title',
  shorttitle: 'titleShort',
  url: 'URL',
  venue: 'eventPlace',
  year: '_year',
  publisher: 'publisher',
  note: '_note',
};

// BibLaTeX parser returns arrays of property values (allowing for repeated
// property entries). For the following fields, just blindly take the first.
const BIBLATEX_PROPERTY_TAKE_FIRST: string[] = [
  'abstract',
  'booktitle',
  '_containerTitle',
  'date',
  'doi',
  'eprint',
  'eprinttype',
  'eventtitle',
  'journaltitle',
  'location',
  'pages',
  'shortjournal',
  'title',
  'shorttitle',
  'url',
  'venue',
  '_year',
  'publisher',
];

export class EntryBibLaTeXAdapter extends Entry {
  abstract?: string;
  _containerTitle?: string;
  containerTitleShort?: string;
  DOI?: string;
  eprint?: string;
  eprinttype?: string;
  event?: string;
  eventPlace?: string;
  issued?: string;
  page?: string;
  publisher?: string;
  publisherPlace?: string;
  title?: string;
  titleShort?: string;
  URL?: string;
  _year?: string;
  _note?: string[];

  constructor(private data: EntryDataBibLaTeX) {
    super();

    Object.entries(BIBLATEX_PROPERTY_MAPPING).forEach(
      (map: [string, string]) => {
        const [src, tgt] = map;
        if (src in this.data.fields) {
          let val = this.data.fields[src];
          if (BIBLATEX_PROPERTY_TAKE_FIRST.includes(src)) {
            val = (val as any[])[0];
          }

          (this as IIndexable)[tgt] = val;
        }
      },
    );
  }

  get id() {
    return this.data.key;
  }
  get type() {
    return this.data.type;
  }

  get itemType(): string {
    if (
      ['online', 'misc', 'unpublished', 'preprint'].includes(this.type) &&
      (this.eprint ||
        hasPreprintMarker(
          this.eprinttype,
          this.data.fields.archiveprefix,
          this.data.fields.archivePrefix,
          this.data.fields.repository,
          this.URL,
          this.repository,
        ))
    ) {
      return 'Preprint';
    }

    return labelForEntryType(this.type);
  }

  get files(): string[] {
    // For some reason the bibtex parser doesn't reliably parse file list to
    // array ; so we'll do it manually / redundantly
    let ret: string[] = [];
    if (this.data.fields.file) {
      ret = ret.concat(this.data.fields.file.flatMap((x) => x.split(';')));
    }
    if (this.data.fields.files) {
      ret = ret.concat(this.data.fields.files.flatMap((x) => x.split(';')));
    }

    return ret;
  }

  get tags(): string[] {
    return normalizeTags(
      this.data.fields.keywords || this.data.fields.keyword,
    );
  }

  get repository(): string {
    const repository = firstFieldValue(this.data.fields.repository);
    const archivePrefix =
      firstFieldValue(this.data.fields.archiveprefix) ||
      firstFieldValue(this.data.fields.archivePrefix);
    const eprintType =
      this.eprinttype || firstFieldValue(this.data.fields.eprinttype);
    const source = repository || archivePrefix || eprintType;

    if (hasPreprintMarker(source)) {
      return normalizeRepositoryName(source);
    }
    if (hasPreprintMarker(this.URL)) {
      const match = this.URL.match(PREPRINT_MARKER_RE);
      return normalizeRepositoryName(match?.[0]);
    }

    return null;
  }

  get authorString() {
    if (this.data.creators.author) {
      const names = this.data.creators.author.map((name) => {
        if (name.literal) return name.literal;
        const parts = [name.firstName, name.prefix, name.lastName, name.suffix];
        // Drop any null parts and join
        return parts.filter((x) => x).join(' ');
      });
      return names.join(', ');
    } else {
      return this.data.fields.author?.join(', ');
    }
  }

  get containerTitle() {
    if (this._containerTitle) {
      return this._containerTitle;
    } else if (this.repository) {
      return this.repository;
    } else if (this.data.fields.eprint) {
      const prefix = this.data.fields.eprinttype
        ? `${this.data.fields.eprinttype}:`
        : '';
      const suffix = this.data.fields.primaryclass
        ? ` [${this.data.fields.primaryclass}]`
        : '';
      return `${prefix}${this.data.fields.eprint}${suffix}`;
    }
  }

  get issuedDate() {
    return this.issued ? new Date(this.issued) : null;
  }

  get author(): Author[] {
    return this.data.creators.author?.map((a) => ({
      given: a.firstName,
      family: a.lastName,
    }));
  }
}
