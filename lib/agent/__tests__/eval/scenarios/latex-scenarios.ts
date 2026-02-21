/**
 * LaTeX Evaluation Scenarios
 *
 * 10 realistic LaTeX scenarios covering common user requests:
 * editing, debugging, package management, multi-file refactoring,
 * and content generation.
 */

import type { EvalScenario } from '../types'

export const latexScenarios: EvalScenario[] = [
  // -----------------------------------------------------------------------
  // 1. fix-missing-end-itemize
  // -----------------------------------------------------------------------
  {
    id: 'latex-001',
    name: 'fix-missing-end-itemize',
    description:
      'Document is missing \\end{itemize}. Agent should detect the mismatch and close the environment.',
    category: 'debug',
    workspaceFiles: [
      {
        path: 'main.tex',
        content: [
          '\\documentclass{article}',
          '\\begin{document}',
          '',
          '\\section{Shopping List}',
          '\\begin{itemize}',
          '  \\item Apples',
          '  \\item Bananas',
          '  \\item Cherries',
          '',
          '\\section{Recipes}',
          'Here are some recipes.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'main.tex',
    compileError: '! LaTeX Error: \\begin{itemize} on input line 5 ended by \\end{document}.',
    compileLogs:
      'l.13 \\end{document}\n! LaTeX Error: \\begin{itemize} on input line 5 ended by \\end{document}.',
    prompt: 'Fix the compile error in my document.',
    expectedEdits: [
      {
        filePath: 'main.tex',
        mustContain: ['\\end{itemize}'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['itemize', 'missing', 'end'],
    weights: { editAccuracy: 2.0, toolEfficiency: 1.0, reasoningQuality: 1.0, responseClarity: 1.0 },
  },

  // -----------------------------------------------------------------------
  // 2. add-booktabs-package
  // -----------------------------------------------------------------------
  {
    id: 'latex-002',
    name: 'add-booktabs-package',
    description:
      'Convert a basic tabular to use booktabs rules. Agent should add \\usepackage{booktabs} and replace \\hline.',
    category: 'latex_edit',
    workspaceFiles: [
      {
        path: 'report.tex',
        content: [
          '\\documentclass{article}',
          '\\usepackage[utf8]{inputenc}',
          '',
          '\\begin{document}',
          '',
          '\\begin{table}[h]',
          '\\centering',
          '\\begin{tabular}{lcc}',
          '\\hline',
          'Name & Score & Grade \\\\',
          '\\hline',
          'Alice & 92 & A \\\\',
          'Bob & 85 & B \\\\',
          'Carol & 78 & C \\\\',
          '\\hline',
          '\\end{tabular}',
          '\\caption{Student Grades}',
          '\\end{table}',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'report.tex',
    prompt: 'Convert the table to use the booktabs package for professional-looking rules.',
    expectedEdits: [
      {
        filePath: 'report.tex',
        mustContain: ['\\usepackage{booktabs}', '\\toprule', '\\midrule', '\\bottomrule'],
        mustNotContain: ['\\hline'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['booktabs', 'toprule', 'hline'],
  },

  // -----------------------------------------------------------------------
  // 3. fix-undefined-citation
  // -----------------------------------------------------------------------
  {
    id: 'latex-003',
    name: 'fix-undefined-citation',
    description:
      'A .bib file has a typo in a citation key. The .tex file references the correct key. Agent should fix the .bib.',
    category: 'debug',
    workspaceFiles: [
      {
        path: 'paper.tex',
        content: [
          '\\documentclass{article}',
          '\\usepackage[backend=biber]{biblatex}',
          '\\addbibresource{refs.bib}',
          '',
          '\\begin{document}',
          '',
          'As shown by \\cite{smith2023deep}, deep learning has advanced rapidly.',
          'Other work \\cite{jones2022survey} provides a comprehensive overview.',
          '',
          '\\printbibliography',
          '\\end{document}',
        ].join('\n'),
      },
      {
        path: 'refs.bib',
        content: [
          '@article{smtih2023deep,',
          '  author  = {Smith, John},',
          '  title   = {Deep Learning Advances},',
          '  journal = {Journal of AI},',
          '  year    = {2023},',
          '  volume  = {15},',
          '  pages   = {100--120},',
          '}',
          '',
          '@article{jones2022survey,',
          '  author  = {Jones, Alice},',
          '  title   = {A Survey of Machine Learning},',
          '  journal = {ML Review},',
          '  year    = {2022},',
          '  volume  = {8},',
          '  pages   = {1--50},',
          '}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'paper.tex',
    compileError: "Package biblatex Warning: Citation 'smith2023deep' undefined.",
    compileLogs:
      "Package biblatex Warning: Citation 'smith2023deep' on line 7 undefined.\nThere were undefined citations.",
    prompt: "I'm getting an undefined citation warning for smith2023deep. Can you fix it?",
    expectedEdits: [
      {
        filePath: 'refs.bib',
        mustContain: ['smith2023deep'],
        mustNotContain: ['smtih2023deep'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['typo', 'bib', 'key'],
  },

  // -----------------------------------------------------------------------
  // 4. add-figure-with-caption
  // -----------------------------------------------------------------------
  {
    id: 'latex-004',
    name: 'add-figure-with-caption',
    description:
      'User asks to add a figure environment. Agent should add graphicx package if missing and the figure.',
    category: 'latex_edit',
    workspaceFiles: [
      {
        path: 'thesis.tex',
        content: [
          '\\documentclass[12pt]{article}',
          '\\usepackage{amsmath}',
          '',
          '\\begin{document}',
          '',
          '\\section{Results}',
          '',
          'Our experimental results are summarized below.',
          '',
          '% TODO: Add figure here',
          '',
          '\\section{Discussion}',
          'The results show significant improvement.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'thesis.tex',
    prompt:
      'Replace the TODO comment with a figure that includes images/results.png with the caption "Experimental results comparison" and label fig:results.',
    expectedEdits: [
      {
        filePath: 'thesis.tex',
        mustContain: [
          '\\usepackage{graphicx}',
          '\\begin{figure}',
          '\\includegraphics',
          'results.png',
          '\\caption{',
          '\\label{fig:results}',
          '\\end{figure}',
        ],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
  },

  // -----------------------------------------------------------------------
  // 5. fix-math-mode-error
  // -----------------------------------------------------------------------
  {
    id: 'latex-005',
    name: 'fix-math-mode-error',
    description:
      'A document uses inline $ inside a display math \\[ \\] environment. Agent should fix the nesting.',
    category: 'debug',
    workspaceFiles: [
      {
        path: 'notes.tex',
        content: [
          '\\documentclass{article}',
          '\\usepackage{amsmath}',
          '',
          '\\begin{document}',
          '',
          '\\section{Derivation}',
          '',
          'The expected value is computed as follows:',
          '\\[',
          '  E[X] = \\sum_{i=1}^{n} $x_i \\cdot p_i$',
          '\\]',
          '',
          'This can be simplified using the identity:',
          '\\[',
          '  \\int_0^1 f(x) \\, dx = F(1) - F(0)',
          '\\]',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'notes.tex',
    compileError: '! Missing $ inserted.',
    compileLogs: 'l.10   E[X] = \\sum_{i=1}^{n} $x_i \\cdot p_i$\n! Missing $ inserted.',
    prompt: 'Fix the math mode error in my document.',
    expectedEdits: [
      {
        filePath: 'notes.tex',
        mustContain: ['x_i \\cdot p_i'],
        mustNotContain: ['$x_i \\cdot p_i$'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['math', 'nested', 'dollar'],
  },

  // -----------------------------------------------------------------------
  // 6. create-bibliography
  // -----------------------------------------------------------------------
  {
    id: 'latex-006',
    name: 'create-bibliography',
    description:
      'User has \\cite commands but no bibliography setup at all. Agent should add biblatex config.',
    category: 'latex_edit',
    workspaceFiles: [
      {
        path: 'essay.tex',
        content: [
          '\\documentclass{article}',
          '\\usepackage[utf8]{inputenc}',
          '',
          '\\title{The Impact of AI}',
          '\\author{Student Name}',
          '',
          '\\begin{document}',
          '\\maketitle',
          '',
          '\\section{Introduction}',
          'Artificial intelligence has transformed many fields \\cite{russell2020ai}.',
          'Recent breakthroughs in large language models \\cite{brown2020gpt3}',
          'have demonstrated remarkable capabilities.',
          '',
          '\\section{Conclusion}',
          'Further research is needed.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'essay.tex',
    compileError: "LaTeX Warning: Citation `russell2020ai' undefined.",
    prompt:
      'Set up a bibliography for my document. I need entries for russell2020ai (Russell & Norvig, AI: A Modern Approach, 2020) and brown2020gpt3 (Brown et al., Language Models are Few-Shot Learners, 2020).',
    expectedEdits: [
      {
        filePath: 'essay.tex',
        mustContain: ['biblatex', '\\printbibliography'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
  },

  // -----------------------------------------------------------------------
  // 7. fix-encoding-error
  // -----------------------------------------------------------------------
  {
    id: 'latex-007',
    name: 'fix-encoding-error',
    description:
      'Document contains a special character (en-dash) that causes an encoding error. Agent should fix it.',
    category: 'debug',
    workspaceFiles: [
      {
        path: 'chapter.tex',
        content: [
          '\\documentclass{article}',
          '',
          '\\begin{document}',
          '',
          '\\section{Historical Overview}',
          '',
          'The period of 1990\u20132000 saw rapid growth in computing.',
          'Key figures include Turing, von Neumann, and Shannon.',
          '',
          'The caf\u00e9 culture of Silicon Valley fostered innovation.',
          '',
          'Knuth\u2019s \\textit{The Art of Computer Programming} remains',
          'a foundational reference.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'chapter.tex',
    compileError:
      'Package inputenc Error: Unicode character \u2013 (U+2013) not set up for use with LaTeX.',
    compileLogs:
      'l.7 The period of 1990\u2013\n! Package inputenc Error: Unicode character \u2013 (U+2013)',
    prompt: 'Fix the encoding errors in my LaTeX document.',
    expectedEdits: [
      {
        filePath: 'chapter.tex',
        // The agent might add inputenc with utf8 or replace the characters with LaTeX commands
        // Either approach is valid
        mustContain: [],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['unicode', 'encoding', 'inputenc'],
  },

  // -----------------------------------------------------------------------
  // 8. refactor-repeated-header
  // -----------------------------------------------------------------------
  {
    id: 'latex-008',
    name: 'refactor-repeated-header',
    description:
      'Two chapter files share the same preamble commands. User asks to extract them into a .sty file.',
    category: 'multi_file',
    workspaceFiles: [
      {
        path: 'main.tex',
        content: [
          '\\documentclass{report}',
          '\\usepackage{mystyle}',
          '\\begin{document}',
          '\\include{chapter1}',
          '\\include{chapter2}',
          '\\end{document}',
        ].join('\n'),
      },
      {
        path: 'chapter1.tex',
        content: [
          '\\newcommand{\\alertbox}[1]{\\fbox{\\textbf{#1}}}',
          '\\newcommand{\\highlight}[1]{\\textcolor{red}{\\textbf{#1}}}',
          '\\usepackage{xcolor}',
          '',
          '\\chapter{Introduction}',
          'This is the introduction. \\alertbox{Important!}',
          'We \\highlight{emphasize} key points here.',
        ].join('\n'),
      },
      {
        path: 'chapter2.tex',
        content: [
          '\\newcommand{\\alertbox}[1]{\\fbox{\\textbf{#1}}}',
          '\\newcommand{\\highlight}[1]{\\textcolor{red}{\\textbf{#1}}}',
          '\\usepackage{xcolor}',
          '',
          '\\chapter{Methods}',
          'Our methodology uses \\alertbox{novel techniques}.',
          'Results are \\highlight{statistically significant}.',
        ].join('\n'),
      },
    ],
    activeFilePath: 'chapter1.tex',
    prompt:
      'The \\alertbox and \\highlight commands are duplicated in chapter1.tex and chapter2.tex. Extract them into mystyle.sty and remove the duplicates from the chapter files.',
    expectedEdits: [
      {
        filePath: 'chapter1.tex',
        mustNotContain: ['\\newcommand{\\alertbox}'],
      },
      {
        filePath: 'chapter2.tex',
        mustNotContain: ['\\newcommand{\\alertbox}'],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['duplicate', 'extract', 'style'],
    weights: { editAccuracy: 2.0, toolEfficiency: 1.0, reasoningQuality: 1.5, responseClarity: 1.0 },
  },

  // -----------------------------------------------------------------------
  // 9. fix-overfull-hbox
  // -----------------------------------------------------------------------
  {
    id: 'latex-009',
    name: 'fix-overfull-hbox',
    description:
      'Compile log shows overfull hbox. Agent should diagnose and suggest a fix (e.g., microtype or line break).',
    category: 'debug',
    workspaceFiles: [
      {
        path: 'article.tex',
        content: [
          '\\documentclass[10pt]{article}',
          '\\usepackage[margin=1in]{geometry}',
          '',
          '\\begin{document}',
          '',
          '\\section{Background}',
          '',
          'The supercalifragilisticexpialidocious experiment demonstrated that',
          'electroencephalographically-monitored participants showed improvements',
          'when using the antidisestablishmentarianism-prevention protocol',
          'described in \\texttt{https://very-long-example-url.com/path/to/resource/that/is/extremely/long/document.pdf}.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'article.tex',
    compileLogs:
      'Overfull \\hbox (42.5pt too wide) in paragraph at lines 8--11\n[]\\OT1/cmr/m/n/10 The su-per-cal-ifrag-ilis-tic-ex-pi-ali-do-cious',
    prompt: 'The compile log shows an overfull hbox warning. Can you fix it?',
    expectedEdits: [
      {
        filePath: 'article.tex',
        // Agent might add microtype, url/hyperref package, or \\url{} command
        mustContain: [],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
    expectedReasoningTopics: ['overfull', 'hbox', 'url'],
  },

  // -----------------------------------------------------------------------
  // 10. add-tikz-diagram
  // -----------------------------------------------------------------------
  {
    id: 'latex-010',
    name: 'add-tikz-diagram',
    description:
      'User asks for a simple TikZ flowchart. Agent should add the tikz package and create the diagram.',
    category: 'latex_edit',
    workspaceFiles: [
      {
        path: 'process.tex',
        content: [
          '\\documentclass{article}',
          '\\usepackage[margin=1in]{geometry}',
          '',
          '\\begin{document}',
          '',
          '\\section{Process Flow}',
          '',
          'The following diagram illustrates our data processing pipeline:',
          '',
          '% TODO: Add flowchart here',
          '',
          'Each stage performs validation before passing data to the next.',
          '',
          '\\end{document}',
        ].join('\n'),
      },
    ],
    activeFilePath: 'process.tex',
    prompt:
      'Replace the TODO comment with a TikZ flowchart showing: Input -> Preprocessing -> Analysis -> Output. Use rectangular nodes with arrows between them.',
    expectedEdits: [
      {
        filePath: 'process.tex',
        mustContain: [
          '\\usepackage{tikz}',
          '\\begin{tikzpicture}',
          'Input',
          'Preprocessing',
          'Analysis',
          'Output',
          '\\end{tikzpicture}',
        ],
      },
    ],
    expectedToolCalls: [
      { toolName: 'apply_file_edit', required: true },
    ],
  },
]
