/**
 * Typst Evaluation Scenarios
 *
 * 6 realistic Typst scenarios covering: import fixes, presentation slides,
 * set-rule scoping, table creation, math alignment, and LaTeX-to-Typst conversion.
 */

import type { EvalScenario } from '../types'

export const typstScenarios: EvalScenario[] = [
  // -----------------------------------------------------------------------
  // 1. fix-broken-import
  // -----------------------------------------------------------------------
  {
    id: 'typst-001',
    name: 'fix-broken-import',
    description:
      'A Typst file imports from a wrong path. Agent should correct the import path.',
    category: 'typst_debug',
    workspaceFiles: [
      {
        path: 'main.typ',
        content: [
          '#import "utils/helpers.typ": format-date, make-title',
          '',
          '#show: doc => {',
          '  set text(font: "New Computer Modern", size: 11pt)',
          '  set page(margin: 2cm)',
          '  doc',
          '}',
          '',
          '= Report',
          '',
          '#make-title("Quarterly Report", "Q4 2025")',
          '',
          'Report generated on #format-date(datetime.today()).',
          '',
          '== Summary',
          '',
          'This quarter showed strong growth across all divisions.',
        ].join('\n'),
      },
      {
        path: 'lib/helpers.typ',
        content: [
          '#let format-date(d) = {',
          '  let months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",',
          '                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")',
          '  let m = months.at(d.month() - 1)',
          '  [#m #d.day(), #d.year()]',
          '}',
          '',
          '#let make-title(title, subtitle) = {',
          '  align(center)[',
          '    #text(size: 20pt, weight: "bold")[#title]',
          '    #v(0.5em)',
          '    #text(size: 14pt, fill: gray)[#subtitle]',
          '    #v(2em)',
          '  ]',
          '}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'main.typ',
    compileError: 'error: file not found (searched at utils/helpers.typ)',
    compileLogs: 'error: file not found (searched at utils/helpers.typ)\n  --> main.typ:1:9',
    prompt: 'Fix the import error. The helpers file exists but the path seems wrong.',
    expectedEdits: [
      {
        filePath: 'main.typ',
        mustContain: ['lib/helpers.typ'],
        mustNotContain: ['utils/helpers.typ'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['import', 'path', 'lib'],
  },

  // -----------------------------------------------------------------------
  // 2. create-touying-slide
  // -----------------------------------------------------------------------
  {
    id: 'typst-002',
    name: 'create-touying-slide',
    description:
      'User asks to create a presentation slide deck. Agent should produce a Typst slide file.',
    category: 'typst_edit',
    workspaceFiles: [
      {
        path: 'slides.typ',
        content: [
          '// Presentation slides',
          '// TODO: Create slide content',
        ].join('\n'),
      },
    ],
    activeFilePath: 'slides.typ',
    prompt:
      'Create a 3-slide presentation about machine learning with: 1) a title slide with "Introduction to ML" as title and "CS Department" as subtitle, 2) a slide listing 3 types of ML (supervised, unsupervised, reinforcement), and 3) a conclusion slide saying "Questions?". Use Typst\'s built-in heading-based slide breaks.',
    expectedEdits: [
      {
        filePath: 'slides.typ',
        mustContain: [
          'Introduction to ML',
          'supervised',
          'unsupervised',
          'reinforcement',
          'Questions',
        ],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
  },

  // -----------------------------------------------------------------------
  // 3. fix-set-rule-scope
  // -----------------------------------------------------------------------
  {
    id: 'typst-003',
    name: 'fix-set-rule-scope',
    description:
      'A #set rule is placed inside a content block where it only affects that block, but the user wants it to apply globally.',
    category: 'typst_debug',
    workspaceFiles: [
      {
        path: 'document.typ',
        content: [
          '#let make-header() = {',
          '  set text(size: 14pt, weight: "bold")',
          '  set par(leading: 0.8em)',
          '  [= Document Title]',
          '}',
          '',
          '#make-header()',
          '',
          'This paragraph should also have 0.8em leading and use the',
          'configured text settings, but it does not because the set',
          'rules are scoped inside the function.',
          '',
          '== Section One',
          '',
          'More content here that should follow the same formatting.',
          '',
          '== Section Two',
          '',
          'Additional content with consistent formatting.',
        ].join('\n'),
      },
    ],
    activeFilePath: 'document.typ',
    prompt:
      'The text settings and paragraph leading from make-header are not applying to the rest of the document. Move the set rules so they apply globally, but keep the header function for the title.',
    expectedEdits: [
      {
        filePath: 'document.typ',
        mustContain: ['set text(', 'set par('],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['scope', 'set', 'global'],
  },

  // -----------------------------------------------------------------------
  // 4. add-table-with-header
  // -----------------------------------------------------------------------
  {
    id: 'typst-004',
    name: 'add-table-with-header',
    description:
      'User asks to add a data table. Agent should create it using the #table() function.',
    category: 'typst_edit',
    workspaceFiles: [
      {
        path: 'report.typ',
        content: [
          '#set text(font: "New Computer Modern", size: 11pt)',
          '#set page(margin: 2cm)',
          '',
          '= Quarterly Sales Report',
          '',
          '== Overview',
          '',
          'The following table summarizes sales by region:',
          '',
          '// TODO: Add sales table here',
          '',
          '== Analysis',
          '',
          'North America continues to lead in total revenue.',
        ].join('\n'),
      },
    ],
    activeFilePath: 'report.typ',
    prompt:
      'Replace the TODO with a table that has columns: Region, Q1, Q2, Q3, Q4. Include rows for North America (120, 135, 142, 160), Europe (95, 102, 110, 125), and Asia (80, 90, 105, 118). Add a bold header row.',
    expectedEdits: [
      {
        filePath: 'report.typ',
        mustContain: [
          '#table(',
          'Region',
          'North America',
          'Europe',
          'Asia',
          '120',
          '160',
        ],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
  },

  // -----------------------------------------------------------------------
  // 5. fix-math-alignment
  // -----------------------------------------------------------------------
  {
    id: 'typst-005',
    name: 'fix-math-alignment',
    description:
      'Math equations should be aligned at the equals sign but are not using the & alignment operator correctly.',
    category: 'typst_debug',
    workspaceFiles: [
      {
        path: 'proof.typ',
        content: [
          '#set text(font: "New Computer Modern", size: 11pt)',
          '',
          '= Proof of the Quadratic Formula',
          '',
          'Starting from the general form:',
          '',
          '$',
          'a x^2 + b x + c = 0',
          'x^2 + b/a x = -c/a',
          'x^2 + b/a x + b^2/(4a^2) = b^2/(4a^2) - c/a',
          '(x + b/(2a))^2 = (b^2 - 4a c)/(4a^2)',
          'x + b/(2a) = plus.minus sqrt(b^2 - 4a c)/(2a)',
          'x = (-b plus.minus sqrt(b^2 - 4a c))/(2a)',
          '$',
          '',
          'This completes the derivation.',
        ].join('\n'),
      },
    ],
    activeFilePath: 'proof.typ',
    prompt:
      'The equations in the proof should be aligned at the equals sign. Fix the math block to use proper Typst alignment.',
    expectedEdits: [
      {
        filePath: 'proof.typ',
        mustContain: ['&'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['align', 'equals', 'math'],
  },

  // -----------------------------------------------------------------------
  // 6. convert-latex-to-typst
  // -----------------------------------------------------------------------
  {
    id: 'typst-006',
    name: 'convert-latex-to-typst',
    description:
      'User provides a LaTeX snippet in a Typst file and asks for conversion. Agent should rewrite it in Typst syntax.',
    category: 'typst_edit',
    workspaceFiles: [
      {
        path: 'converted.typ',
        content: [
          '// Convert the following LaTeX to Typst:',
          '//',
          '// \\documentclass{article}',
          '// \\usepackage{amsmath}',
          '// \\begin{document}',
          '// \\title{Analysis Report}',
          '// \\author{Dr.~Jane Smith}',
          '// \\maketitle',
          '//',
          '// \\section{Introduction}',
          '// Let $f(x) = \\frac{1}{\\sqrt{2\\pi}} e^{-x^2/2}$ denote the',
          '// standard normal PDF.',
          '//',
          '// \\begin{enumerate}',
          '//   \\item The mean is $\\mu = 0$.',
          '//   \\item The variance is $\\sigma^2 = 1$.',
          '//   \\item The integral $\\int_{-\\infty}^{\\infty} f(x)\\,dx = 1$.',
          '// \\end{enumerate}',
          '//',
          '// \\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'converted.typ',
    prompt:
      'Convert the LaTeX code in the comments to proper Typst syntax. Replace the entire file content with the Typst version.',
    expectedEdits: [
      {
        filePath: 'converted.typ',
        mustContain: [
          'Analysis Report',
          'Jane Smith',
          'Introduction',
          'mean',
          'variance',
        ],
        mustNotContain: [
          '\\documentclass',
          '\\begin{document}',
          '\\end{document}',
          '\\section{',
          '\\frac{',
        ],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['latex', 'typst', 'convert'],
    weights: { editAccuracy: 2.0, toolEfficiency: 0.5, reasoningQuality: 1.0, responseClarity: 1.0 },
  },
]
