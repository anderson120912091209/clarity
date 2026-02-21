export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  readingTime: string
  author: string
  tags: string[]
  keywords: string[]
  content: string
}

const biologyWritingGuide: BlogPost = {
  slug: 'biology-research-paper-writing-latex-typst-clarity',
  title: 'How Biology Researchers Write Professional Journals with LaTeX, Typst, and Clarity',
  description:
    'A practical guide for biology researchers to write publishable, professional journal manuscripts using LaTeX, Typst, and AI-assisted editing workflows.',
  publishedAt: '2026-02-21',
  readingTime: '11 min read',
  author: 'Clarity Editorial Team',
  tags: ['Biology Research', 'LaTeX', 'Typst', 'Scientific Writing', 'Academic SEO'],
  keywords: [
    'biology research paper writing',
    'latex for biology researchers',
    'typst scientific writing',
    'how scientists write professional documents',
    'scientific manuscript writing guide',
    'academic writing workflow',
  ],
  content: `
Biology research is judged twice: once by the quality of the science, and again by the clarity of the manuscript.

Strong experiments can still struggle in peer review when a paper is hard to follow, inconsistently formatted, or poorly structured. Professional research writing is not only about grammar. It is about repeatable structure, clean citations, figure quality, and disciplined collaboration.

This guide shows a practical system biology researchers can use to write professional journals with **LaTeX**, **Typst**, and **Clarity**.

## Why professional scientific writing needs structure

Biology papers often include:

- Dense methods sections
- Multiple figures with subpanels
- Statistical reporting
- Dozens (or hundreds) of references
- Frequent co-author edits

Word processors become fragile under this level of complexity. Scientists prefer writing languages like LaTeX and Typst because they separate content from presentation. That lets you focus on your argument while keeping formatting consistent.

## LaTeX vs Typst for biology manuscripts

Both are excellent choices. Pick based on team workflow and journal constraints.

| Requirement | LaTeX | Typst |
| --- | --- | --- |
| Journal template compatibility | Excellent (most journals support it) | Improving, but still less universal |
| Ecosystem maturity | Very high | Growing quickly |
| Learning curve | Steeper | Easier for new users |
| Team familiarity in academia | Very common | Less common (but increasing) |
| Syntax readability | Good | Very clean and modern |

If your PI or target journal already has a LaTeX template, start there. If you want faster onboarding and cleaner syntax for internal drafts, Typst can be a strong option.

## A professional writing workflow used by experienced scientists

### 1) Start with the claim, not the formatting

Before writing full paragraphs, draft:

- The main biological question
- Your core result (one sentence)
- The key supporting evidence (3 to 5 bullet points)
- The specific audience (journal + field)

This prevents scope drift and keeps the manuscript focused.

### 2) Build a manuscript skeleton first

Create the IMRaD structure (Introduction, Methods, Results, and Discussion) before polishing language. This gives co-authors a stable map.

For example:

- Introduction: problem, gap, hypothesis
- Methods: design, samples, protocol, statistics
- Results: figure-driven claims
- Discussion: interpretation, limits, next steps

### 3) Manage references from day one

Do not postpone citation cleanup to the end. Use a \`.bib\` file early and cite as you write.

\`\`\`latex
\\section{Introduction}
Recent work in single-cell analysis has improved cell-state resolution~\\cite{stuart2019}.

\\bibliographystyle{unsrt}
\\bibliography{references}
\`\`\`

In Typst:

\`\`\`typst
#bibliography("references.bib", style: "ieee")

Recent work in single-cell analysis has improved cell-state resolution @stuart2019.
\`\`\`

### 4) Treat figures and tables as part of the argument

In biology writing, figures are often your primary evidence. Each figure should answer one question, and each legend should be interpretable without searching the main text.

Checklist:

- Consistent font sizes and units
- Explicit sample size (*n*)
- Exact statistical test names
- Clear panel labels (A, B, C...)
- Reproducible source files in version control

### 5) Write for clarity, not complexity

Professional scientific writing is precise, not inflated.

Use this sentence pattern:

- **Context:** What is known?
- **Gap:** What is missing?
- **Action:** What did you do?
- **Finding:** What did you observe?
- **Meaning:** Why does it matter?

This keeps paragraphs readable in high-density sections like Results and Discussion.

### 6) Collaborate with explicit responsibilities

Most biology manuscripts are multi-author. Avoid chaotic editing by assigning roles:

- First author: narrative consistency and figures
- Methods owner: protocol precision and reproducibility details
- Senior author: claim accuracy and positioning
- Statistician (if applicable): test validity and reporting consistency

When everyone edits everything at once without structure, clarity drops fast.

### 7) Run a pre-submission quality pass

Before submission, run one final technical pass:

- Citation completeness (no missing keys)
- Figure references and numbering
- Supplementary material cross-links
- Acronym consistency
- Grammar and readability pass
- Journal formatting compliance

This step alone can prevent avoidable desk rejections.

## How Clarity helps biology researchers write faster and cleaner

Clarity is designed for scientific writing workflows, including LaTeX and Typst documents.

Use it to:

- Draft sections with a clear scientific tone
- Rewrite dense paragraphs for readability while preserving meaning
- Catch formatting/citation issues earlier
- Collaborate in real time with co-authors
- Compile quickly and review visual output as you write

A practical in-app routine:

1. Import your manuscript skeleton.
2. Write section-by-section with references in place.
3. Ask AI to simplify overlong sentences without changing claims.
4. Resolve compile and structure issues continuously.
5. Run a final clarity + consistency pass before submission.

## Common mistakes biology researchers should avoid

- Writing the introduction as a textbook chapter instead of a targeted argument
- Overloading methods with unnecessary detail while omitting critical parameters
- Reporting p-values without full statistical context
- Inconsistent terminology for genes, proteins, or cell populations
- Last-minute citation and formatting cleanup

Avoiding these mistakes improves both reviewer comprehension and editorial confidence.

## Final takeaway

Scientists write professional documents by combining:

- A disciplined manuscript structure
- A robust writing language (LaTeX or Typst)
- A repeatable editing and collaboration workflow
- Clarity-focused revision before submission

If you apply this system consistently, your biology papers become easier to review, easier to trust, and much more publishable.

[Start writing your next manuscript in Clarity](/login)
`,
}

const posts: BlogPost[] = [biologyWritingGuide]

export function getAllBlogPosts() {
  return posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

export function getBlogPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug)
}
