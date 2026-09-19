# The Digital Textbook: OpenStax's book, built into the site

`build.py` turns OpenStax's *Introduction to Behavioral Neuroscience* from its published source into
the site's Digital Textbook: `site/textbook.html`, the whole book on one page, every chapter a fold
that opens to its sections and every section a fold that opens to its text, the preface and appendix
folds of their own, and every figure recompressed to WebP under `site/assets/textbook/img/`. The pages' dress is `site/assets/textbook.css` and their folding
`site/assets/textbook.js`.

## Rebuild
    git clone --depth 1 https://github.com/openstax/osbooks-neuroscience.git /somewhere/osbooks-neuroscience
    pip install pillow
    cd scripts/textbook
    python3 build.py /somewhere/osbooks-neuroscience

The source is not kept in this repository: it is 300 MB of images. Images already converted are
skipped on a rebuild, so re-running after a text change takes seconds.

## What it does with the source
- The collection file gives the chapters and their order; each module is one section, the first
  of each chapter its introduction.
- CNXML becomes HTML element by element: sections and titles, paragraphs, figures with their
  images and captions, notes (In the lab, Meet the author, Across species, In the wild, and the
  boxed features) as asides, lists, tables (CALS, with column and row spans), terms, emphasis,
  cross-references (which take the title of what they point to when the source leaves them
  empty), external links, MathML passed through, and the learning-objectives, summary, key-terms
  and references sections in their own dress.
- The multiple-choice and fill-in-the-blank exercises, and the videos, are `os-embed` links and
  iframes to OpenStax's own platform and are not in the source. A section that has them ends
  with one line saying so, linking to the book on openstax.org; a video becomes a link where it
  stood.
- The citations in the text, "(Surname, 2009)", "Surname et al. (2012)", "Surname & Other, 2015",
  are not marked up in the source. The build numbers each section's reference entries, indexes
  them by first author and year, finds the citations in the text with a pattern, and wraps each
  one that has an entry in a button carrying the entry's id; the page opens the entry under the
  line on a click. Where two entries share an author and a year, "et al." prefers an entry with
  three or more authors and a pair prefers one whose second author matches. Web addresses in the
  reference lists become links.
- Every id in a module is prefixed with the module's id, so nothing collides when several
  sections share a page.
- Every page ends with the attribution the CC BY-NC-SA 4.0 licence asks for. See
  `docs/PERMISSIONS.md`.
