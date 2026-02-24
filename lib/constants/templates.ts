const blankContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{a4paper, margin=1in}

\\title{Document Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Your introduction goes here.

\\section{Main Content}
Your main content goes here.

\\section{Conclusion}
Your conclusion goes here.

\\end{document}`

const resumeContent = `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\setlength{\\multicolsep}{-3.0pt}
\\setlength{\\columnsep}{-1pt}
\\input{glyphtounicode}
\\usepackage{textcomp}
\\usepackage{amssymb}

\\usepackage[sfdefault]{FiraSans}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-.7in}
\\addtolength{\\textheight}{1.4in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\classesList}[4]{
    \\item\\small{
        {#1 #2 #3 #4 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & \\textbf{\\small #2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & \\textbf{\\small #2}\\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
    {\\Huge \\scshape John Doe} \\\\ \\vspace{1pt}
    \\small \\raisebox{-0.1\\height}\\faPhone\\ 555-123-4567 ~ \\href{mailto:johndoe@email.com}{\\raisebox{-0.2\\height}\\faEnvelope\\  \\underline{johndoe@email.com}} ~ 
    \\href{https://www.linkedin.com/in/johndoe}{\\raisebox{-0.2\\height}\\faLinkedin\\ \\underline{linkedin}}  ~
    \\href{https://github.com/johndoe}{\\raisebox{-0.2\\height}\\faGithub\\ \\underline{johndoe}}
\\end{center}

\\section{Experience}
  \\resumeSubHeadingListStart
  
\\resumeSubheading
  {TechCorp Solutions}{Jan 2023 -- Current}
  {Software Engineer}{New York, New York}
  \\resumeItemListStart
    \\resumeItem{Led the frontend redesign and development for TechCorp's flagship product, modernizing the user interface and improving user experience.}
    \\resumeItem{Spearheaded the transition from legacy PHP to a modern React and TailwindCSS stack. Authored the initial codebase and was a key contributor in a team of 15.}
    \\resumeItem{Designed over \\textbf{50} screens in Figma, including complex dashboards and authentication flows, which guided the team's UI implementation.}
    \\resumeItem{Developed an AI-powered feature using machine learning models, reducing average query resolution times by \\textbf{3x}.}    
    \\resumeItem{Implemented advanced natural language processing workflows, fine-tuned on custom datasets, and established benchmarks for language model performance.}
    \\resumeItem{Engaged in comprehensive bug fixing, product issue investigation, and provided direct customer support to enhance overall product quality.}
  \\resumeItemListEnd
    
    \\resumeSubheading
      {TechCorp Solutions}{Sept 2022 -- Jan 2023}
      {Software Engineering Intern}{New York, New York}
      \\resumeItemListStart
        \\resumeItem{Designed and implemented a robust undo/redo system for the company's dashboard, handling complex state management across various operations.}
        \\resumeItem{Created a prototype for an intelligent autocomplete feature to enhance the company's log monitoring tool.}
        \\resumeItem{Developed an interactive network visualization tool using D3.js, improving the representation of complex system architectures.}
  \\resumeItemListEnd
    
    \\resumeSubheading
      {Creative Dynamics}{Nov 2021 -- Sep 2022}
      {UX/UI Designer}{San Francisco, California}
      \\resumeItemListStart
        \\resumeItem{Collaborated directly with the Creative Director on high-impact projects for major clients.}
        \\resumeItem{Utilized advanced design tools including Figma, Adobe Creative Suite, and Sketch to create compelling product and marketing designs.}
        \\resumeItem{Produced comprehensive UX deliverables including user flows, wireframes, and interactive prototypes to effectively communicate design concepts.}
        \\resumeItem{Led a series of web development workshops, teaching fundamentals of HTML, CSS, and JavaScript to a group of 25+ aspiring developers.}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd
\\vspace{-16pt}

\\section{Projects}
    \\vspace{-5pt}
    \\resumeSubHeadingListStart
      \\resumeProjectHeading
          {\\textbf{\\href{https://interactive-chart-demo.vercel.app/}{Interactive Chart}} $|$ \\emph{$\\bigstar$ 300, TypeScript, D3.js }}{July 2024}
          \\resumeItemListStart
            \\resumeItem{Viral project with over 200k impressions on social media, featured by prominent tech influencers.}
            \\resumeItem{A responsive and intuitive charting solution built with modern web technologies and optimized for performance.}
          \\resumeItemListEnd
    \\vspace{-10pt}
    \\resumeProjectHeading
          {\\textbf{\\href{https://ai-search-assistant.vercel.app/}{AI Search Assistant}} $|$ \\emph{TypeScript, React, Redis}}{July 2024}
          \\resumeItemListStart
            \\resumeItem{Developed an AI-powered search tool using cutting-edge technologies including NextJS, Redis for caching, and advanced NLP models.}
            \\resumeItem{Gained significant traction in the developer community with thousands of users and positive feedback.}
          \\resumeItemListEnd
    \\vspace{-10pt}
    \\resumeProjectHeading
          {\\textbf{\\href{https://www.learnsmart.ai/}{LearnSmart}} $|$ \\emph{NextJS, Vercel, Typescript, OpenAI }}{March 2023}
          \\resumeItemListStart
            \\resumeItem{Educational platform that reached 15k active users. Designed engaging UI/UX with Figma and created promotional content using motion graphics.}
            \\resumeItem{Implemented an innovative quiz generation system using AI, creating dynamic and interactive learning experiences.}
            \\resumeItem{Integrated advanced features including LaTeX rendering for mathematical content and code syntax highlighting for programming lessons.}
          \\resumeItemListEnd
        \\vspace{5pt}
    \\resumeSubHeadingListEnd
\\vspace{-15pt}

\\section{Awards}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{National Coding Competition (2021)}{: 15th place nationally, 2x Regional Winner, 2x National Finalist} \\\\
     \\textbf{State Science Olympiad (2020, 2021)}{: 18th place nationally - 7 gold medals (Computer Science, Physics, Chemistry, Biology, Mathematics, Engineering, Robotics)} \\\\
     \\textbf{AP Scholar with Distinction (2020, 2021)}{: Outstanding scores on 10+ AP Exams} \\\\
     \\textbf{Local Community College (2021)}{: STEM Excellence Award, given to top 5 students in the program} \\\\
    }}
 \\end{itemize}
 \\vspace{-16pt}

\\end{document}`

const reportContent = `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}

\\title{Your Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents

\\chapter{Introduction}
This is the introduction to your report.

\\chapter{Methodology}
Describe your methodology here.

\\chapter{Results}
Present your results in this chapter.

\\chapter{Discussion}
Discuss your findings here.

\\chapter{Conclusion}
Summarize your report and provide conclusions.

\\appendix
\\chapter{Additional Data}
Include any additional data or information here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`

const letterContent = `\\documentclass{letter}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{color}
\\usepackage{geometry}
\\usepackage{fancyhdr}

\\geometry{
  a4paper,
  left=25mm,
  right=25mm,
  top=30mm,
  bottom=30mm
}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{\\thepage}

\\signature{John Doe}
\\address{123 Main Street\\\\
Anytown, State 12345\\\\
Phone: (555) 123-4567\\\\
Email: johndoe@email.com}

\\date{\\today}

\\begin{document}

\\begin{letter}{Jane Smith\\\\
456 Oak Avenue\\\\
Othertown, State 67890}

\\opening{Dear Ms. Smith,}

\\noindent I hope this letter finds you well. I am writing to discuss the following important matters:

\\begin{enumerate}
    \\item \\textbf{Project Update:} Our team has made significant progress on the XYZ project. We are currently ahead of schedule and expect to complete the first phase by the end of next month.
    
    \\item \\textbf{Budget Considerations:} Due to recent market changes, we may need to adjust our budget allocation. I've attached a detailed report for your review.
    
    \\item \\textbf{Upcoming Meeting:} I would like to schedule a meeting next week to discuss these points in detail. Please let me know your availability.
\\end{enumerate}

\\noindent Additionally, I wanted to bring your attention to the graph below, which illustrates our project's progress over the past quarter:

\\noindent If you have any questions or concerns, please don't hesitate to reach out. I look forward to our continued collaboration on this project.

\\closing{Best regards,}

\\ps{P.S. Don't forget about the team building event next Friday. It would be great to see you there!}

\\encl{
    Project Progress Report\\\\
    Budget Adjustment Proposal\\\\
    Team Building Event Invitation
}

\\end{letter}

\\end{document}`

const proposalContent = `\\documentclass[12pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}

\\title{Project Proposal}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Executive Summary}
% Provide a brief overview of your proposal

\\section{Problem Statement}
% Clearly define the problem you are addressing

\\section{Proposed Solution}
% Describe your proposed solution in detail

\\section{Methodology}
% Outline the steps you will take to implement your solution

\\section{Timeline}
\\begin{enumerate}[label=\\arabic*.]
    \\item Phase 1: Planning and Research
    \\item Phase 2: Development
    \\item Phase 3: Testing and Refinement
    \\item Phase 4: Implementation
    \\item Phase 5: Evaluation
\\end{enumerate}

\\section{Budget}
% Provide a detailed breakdown of the project costs

\\section{Expected Outcomes}
% Describe the anticipated results and benefits of your project

\\section{Conclusion}
% Summarize the key points of your proposal

\\end{document}`



const presentationContent = `\\documentclass[aspectratio=169]{beamer}

% ── Metropolis: clean, modern Beamer theme ──
\\usetheme{metropolis}

% Accent colour — change to match your institution
\\definecolor{accent}{HTML}{23373B}
\\setbeamercolor{frametitle}{bg=accent}

\\usepackage{appendixnumberbeamer}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\title{Presentation Title}
\\subtitle{A concise subtitle for context}
\\author{Author Name}
\\institute{Department of Computer Science \\\\ University Name}
\\date{\\today}

\\begin{document}

% ── Title ──
\\maketitle

% ── Outline ──
\\begin{frame}{Outline}
  \\setbeamertemplate{section in toc}[sections numbered]
  \\tableofcontents[hideallsubsections]
\\end{frame}

% ══════════════════════════════════════
\\section{Introduction}
% ══════════════════════════════════════

\\begin{frame}{Motivation}
  \\begin{itemize}
    \\item Why does this problem matter?
    \\item What gap in knowledge are we addressing?
    \\item What is the key insight of our approach?
  \\end{itemize}
\\end{frame}

% ══════════════════════════════════════
\\section{Background}
% ══════════════════════════════════════

\\begin{frame}{Key Concepts}
  \\begin{columns}[T]
    \\begin{column}{0.48\\textwidth}
      \\textbf{Concept A}
      \\begin{itemize}
        \\item Detail 1
        \\item Detail 2
      \\end{itemize}
    \\end{column}
    \\begin{column}{0.48\\textwidth}
      \\textbf{Concept B}
      \\begin{itemize}
        \\item Detail 1
        \\item Detail 2
      \\end{itemize}
    \\end{column}
  \\end{columns}
\\end{frame}

% ══════════════════════════════════════
\\section{Methodology}
% ══════════════════════════════════════

\\begin{frame}{Approach}
  Our method can be expressed as:
  \\begin{equation*}
    \\mathcal{L}(\\theta) = \\sum_{i=1}^{N} \\ell\\bigl(f_\\theta(x_i),\\, y_i\\bigr) + \\lambda \\|\\theta\\|^2
  \\end{equation*}

  \\begin{enumerate}
    \\item Preprocess the dataset
    \\item Train the model with regularisation
    \\item Evaluate on the held-out test set
  \\end{enumerate}
\\end{frame}

% ══════════════════════════════════════
\\section{Results}
% ══════════════════════════════════════

\\begin{frame}{Experimental Results}
  \\begin{table}
    \\centering
    \\begin{tabular}{@{}lcc@{}}
      \\toprule
      \\textbf{Method} & \\textbf{Accuracy} & \\textbf{F1 Score} \\\\
      \\midrule
      Baseline   & 82.1\\% & 0.79 \\\\
      Ours       & \\textbf{91.4\\%} & \\textbf{0.90} \\\\
      \\bottomrule
    \\end{tabular}
    \\caption{Comparison on the benchmark dataset.}
  \\end{table}
\\end{frame}

% ══════════════════════════════════════
\\section{Conclusion}
% ══════════════════════════════════════

\\begin{frame}{Summary}
  \\begin{itemize}
    \\item We proposed a new approach to \\ldots
    \\item Achieved state-of-the-art results on \\ldots
    \\item Future work: extend to \\ldots
  \\end{itemize}

  \\vfill
  \\centering
  \\large Thank you! Questions?
\\end{frame}

% ══════════════════════════════════════
\\appendix
% ══════════════════════════════════════

\\begin{frame}[allowframebreaks]{References}
  \\bibliography{references}
  \\bibliographystyle{abbrv}
\\end{frame}

\\end{document}`

const presentationClassicContent = `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}

\\title{Presentation Title}
\\subtitle{A Subtitle}
\\author{Author Name}
\\institute{Institute Name}
\\date{\\today}

\\begin{document}

\\begin{frame}
  \\titlepage
\\end{frame}

\\begin{frame}{Outline}
  \\tableofcontents
\\end{frame}

\\section{Introduction}
\\begin{frame}{Introduction}
  \\begin{itemize}
    \\item Item 1
    \\item Item 2
    \\item Item 3
  \\end{itemize}
\\end{frame}

\\section{Main Body}
\\begin{frame}{Main Body Slide}
  \\begin{block}{Block Title}
    Block content.
  \\end{block}

  \\begin{alertblock}{Alert Block Title}
    Alert block content.
  \\end{alertblock}

  \\begin{exampleblock}{Example Block Title}
    Example block content.
  \\end{exampleblock}
\\end{frame}

\\section{Conclusion}
\\begin{frame}{Conclusion}
  \\begin{itemize}
    \\item Summary point 1
    \\item Summary point 2
  \\end{itemize}
\\end{frame}

\\end{document}`

const assignmentContent = `\\documentclass[11pt]{article}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

\\title{Assignment Title}
\\author{Student Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{Problem 1}
State the problem here.

\\begin{proof}[Solution]
  Write your solution here.
\\end{proof}

\\section*{Problem 2}
State the next problem.

\\begin{proof}[Solution]
  Write your solution here.
\\end{proof}

\\end{document}`

const ieeeConfContent = `\\documentclass[conference]{IEEEtran}
\\IEEEoverridecommandlockouts
% The preceding line is only needed to identify funding in the first footnote. If that is unneeded, please comment it out.
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}
\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
    T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}
\\begin{document}

\\title{Conference Paper Title*\\\\
{\\footnotesize \\textsuperscript{*}Note: Sub-titles are not captured in Xplore and
should not be used}
\\thanks{Identify applicable funding agency here. If none, delete this.}
}

\\author{\\IEEEauthorblockN{1\\textsuperscript{st} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
\\and
\\IEEEauthorblockN{2\\textsuperscript{nd} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
\\and
\\IEEEauthorblockN{3\\textsuperscript{rd} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
\\and
\\IEEEauthorblockN{4\\textsuperscript{th} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
\\and
\\IEEEauthorblockN{5\\textsuperscript{th} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
\\and
\\IEEEauthorblockN{6\\textsuperscript{th} Given Name Surname}
\\IEEEauthorblockA{\\textit{dept. name of organization (of Aff.)} \\\\
\\textit{name of organization (of Aff.)}\\\\
City, Country \\\\
email address or ORCID}
}

\\maketitle

\\begin{abstract}
This document is a model and instructions for \\LaTeX.
This and the IEEEtran.cls file define the components of your paper [title, text, heads, etc.]. *CRITICAL: Do Not Use Symbols, Special Characters, Footnotes,
or Math in Paper Title or Abstract.
\\end{abstract}

\\begin{IEEEkeywords}
component, formatting, style, styling, insert
\\end{IEEEkeywords}

\\section{Introduction}
This document is a model and instructions for \\LaTeX.
Please observe the conference page limits.

\\section{Ease of Use}

\\subsection{Maintaining the Integrity of the Specifications}

The IEEEtran class file is used to format your paper and style the text. All margins,
column widths, line spaces, and text fonts are prescribed; please do not
alter them. You may note peculiarities. For example, the head margin
measures proportionately more than is customary. This measurement
and others are deliberate, using specifications that anticipate your paper
as one part of the entire proceedings, and not as an independent document.
Please do not revise any of the current designations.

\\section{Prepare Your Paper Before Styling}
Before you begin to format your paper, first write and save the content as a
separate text file. Complete all content and organizational editing before
formatting. Please note sections \\ref{AA}--\\ref{SCM} below for more information on
proofreading, spelling and grammar.

Keep your text and graphic files separate until after the text has been
formatted and styled. Do not number text heads---{\\LaTeX} will do that
for you.

\\subsection{Abbreviations and Acronyms}\\label{AA}
Define abbreviations and acronyms the first time they are used in the text,
even after they have been defined in the abstract. Abbreviations such as
IEEE, SI, MKS, CGS, ac, dc, and rms do not have to be defined. Do not use
abbreviations in the title or heads unless they are unavoidable.

\\subsection{Units}
\\begin{itemize}
\\item Use either SI (MKS) or CGS as primary units. (SI units are encouraged.) English units may be used as secondary units (in parentheses). An exception would be the use of English units as identifiers in trade, such as \`\`3.5-inch disk drive''.
\\item Avoid combining SI and CGS units, such as current in amperes and magnetic field in oersteds. This often leads to confusion because equations do not balance dimensionally. If you must use mixed units, clearly state the units for each quantity that you use in an equation.
\\item Do not mix complete spellings and abbreviations of units: \`\`Wb/m\\textsuperscript{2}'' or \`\`webers per square meter'', not \`\`webers/m\\textsuperscript{2}''. Spell out units when they appear in text: \`\`. . . a few henries'', not \`\`. . . a few H''.
\\item Use a zero before decimal points: \`\`0.25'', not \`\`.25''. Use \`\`cm\\textsuperscript{3}'', not \`\`cc''.)
\\end{itemize}

\\subsection{Equations}
Number equations consecutively. To make your
equations more compact, you may use the solidus (~/~), the exp function, or
appropriate exponents. Italicize Roman symbols for quantities and variables,
but not Greek symbols. Use a long dash rather than a hyphen for a minus
sign. Punctuate equations with commas or periods when they are part of a
sentence, as in:
\\begin{equation}
a+b=\\gamma\\label{eq}
\\end{equation}

Be sure that the
symbols in your equation have been defined before or immediately following
the equation. Use \`\`\\eqref{eq}'', not \`\`Eq.~\\eqref{eq}'' or \`\`equation \\eqref{eq}'', except at
the beginning of a sentence: \`\`Equation \\eqref{eq} is . . .''

\\subsection{\\LaTeX-Specific Advice}

Please use \`\`soft'' (e.g., \\verb|\\eqref{Eq}|) cross references instead
of \`\`hard'' references (e.g., \\verb|(1)|). That will make it possible
to combine sections, add equations, or change the order of figures or
citations without having to go through the file line by line.

Please don't use the \\verb|{eqnarray}| equation environment. Use
\\verb|{align}| or \\verb|{IEEEeqnarray}| instead. The \\verb|{eqnarray}|
environment leaves unsightly spaces around relation symbols.

Please note that the \\verb|{subequations}| environment in {\\LaTeX}
will increment the main equation counter even when there are no
equation numbers displayed. If you forget that, you might write an
article in which the equation numbers skip from (17) to (20), causing
the copy editors to wonder if you've discovered a new method of
counting.

{\\BibTeX} does not work by magic. It doesn't get the bibliographic
data from thin air but from .bib files. If you use {\\BibTeX} to produce a
bibliography you must send the .bib files.

{\\LaTeX} can't read your mind. If you assign the same label to a
subsubsection and a table, you might find that Table I has been cross
referenced as Table IV-B3.

{\\LaTeX} does not have precognitive abilities. If you put a
\\verb|\\label| command before the command that updates the counter it's
supposed to be using, the label will pick up the last counter to be
cross referenced instead. In particular, a \\verb|\\label| command
should not go before the caption of a figure or a table.

Do not use \\verb|\\nonumber| inside the \\verb|{array}| environment. It
will not stop equation numbers inside \\verb|{array}| (there won't be
any anyway) and it might stop a wanted equation number in the
surrounding equation.

\\subsection{Some Common Mistakes}\\label{SCM}
\\begin{itemize}
\\item The word \`\`data'' is plural, not singular.
\\item The subscript for the permeability of vacuum $\\mu_{0}$, and other common scientific constants, is zero with subscript formatting, not a lowercase letter \`\`o''.
\\item In American English, commas, semicolons, periods, question and exclamation marks are located within quotation marks only when a complete thought or name is cited, such as a title or full quotation. When quotation marks are used, instead of a bold or italic typeface, to highlight a word or phrase, punctuation should appear outside of the quotation marks. A parenthetical phrase or statement at the end of a sentence is punctuated outside of the closing parenthesis (like this). (A parenthetical sentence is punctuated within the parentheses.)
\\item A graph within a graph is an \`\`inset'', not an \`\`insert''. The word alternatively is preferred to the word \`\`alternately'' (unless you really mean something that alternates).
\\item Do not use the word \`\`essentially'' to mean \`\`approximately'' or \`\`effectively''.
\\item In your paper title, if the words \`\`that uses'' can accurately replace the word \`\`using'', capitalize the \`\`u''; if not, keep using lower-cased.
\\item Be aware of the different meanings of the homophones \`\`affect'' and \`\`effect'', \`\`complement'' and \`\`compliment'', \`\`discreet'' and \`\`discrete'', \`\`principal'' and \`\`principle''.
\\item Do not confuse \`\`imply'' and \`\`infer''.
\\item The prefix \`\`non'' is not a word; it should be joined to the word it modifies, usually without a hyphen.
\\item There is no period after the \`\`et'' in the Latin abbreviation \`\`et al.''.
\\item The abbreviation \`\`i.e.'' means \`\`that is'', and the abbreviation \`\`e.g.'' means \`\`for example''.
\\end{itemize}
An excellent style manual for science writers is \\cite{b7}.

\\subsection{Authors and Affiliations}
\\textbf{The class file is designed for, but not limited to, six authors.} A
minimum of one author is required for all conference articles. Author names
should be listed starting from left to right and then moving down to the
next line. This is the author sequence that will be used in future citations
and by indexing services. Names should not be listed in columns nor group by
affiliation. Please keep your affiliations as succinct as possible (for
example, do not differentiate among departments of the same organization).

\\subsection{Identify the Headings}
Headings, or heads, are organizational devices that guide the reader through
your paper. There are two types: component heads and text heads.

Component heads identify the different components of your paper and are not
topically subordinate to each other. Examples include Acknowledgments and
References and, for these, the correct style to use is \`\`Heading 5''. Use
\`\`figure caption'' for your Figure captions, and \`\`table head'' for your
table title. Run-in heads, such as \`\`Abstract'', will require you to apply a
style (in this case, italic) in addition to the style provided by the drop
down menu to differentiate the head from the text.

Text heads organize the topics on a relational, hierarchical basis. For
example, the paper title is the primary text head because all subsequent
material relates and elaborates on this one topic. If there are two or more
sub-topics, the next level head (uppercase Roman numerals) should be used
and, conversely, if there are not at least two sub-topics, then no subheads
should be introduced.

\\subsection{Figures and Tables}
\\paragraph{Positioning Figures and Tables} Place figures and tables at the top and
bottom of columns. Avoid placing them in the middle of columns. Large
figures and tables may span across both columns. Figure captions should be
below the figures; table heads should appear above the tables. Insert
figures and tables after they are cited in the text. Use the abbreviation
\`\`Fig.~\\ref{fig}'', even at the beginning of a sentence.

\\begin{table}[htbp]
\\caption{Table Type Styles}
\\begin{center}
\\begin{tabular}{|c|c|c|c|}
\\hline
\\textbf{Table}&\\multicolumn{3}{|c|}{\\textbf{Table Column Head}} \\\\
\\cline{2-4}
\\textbf{Head} & \\textbf{\\textit{Table column subhead}}& \\textbf{\\textit{Subhead}}& \\textbf{\\textit{Subhead}} \\\\
\\hline
copy& More table copy$^{\\mathrm{a}}$& &  \\\\
\\hline
\\multicolumn{4}{l}{$^{\\mathrm{a}}$Sample of a Table footnote.}
\\end{tabular}
\\label{tab1}
\\end{center}
\\end{table}

\\begin{figure}[htbp]
\\centerline{\\includegraphics{fig1.png}}
\\caption{Example of a figure caption.}
\\label{fig}
\\end{figure}

Figure Labels: Use 8 point Times New Roman for Figure labels. Use words
rather than symbols or abbreviations when writing Figure axis labels to
avoid confusing the reader. As an example, write the quantity
\`\`Magnetization'', or \`\`Magnetization, M'', not just \`\`M''. If including
units in the label, present them within parentheses. Do not label axes only
with units. In the example, write \`\`Magnetization (A/m)'' or \`\`Magnetization
\\{A[m(1)]\\}'', not just \`\`A/m''. Do not label axes with a ratio of
quantities and units. For example, write \`\`Temperature (K)'', not
\`\`Temperature/K''.

\\section*{Acknowledgment}

The preferred spelling of the word \`\`acknowledgment'' in America is without
an \`\`e'' after the \`\`g''. Avoid the stilted expression \`\`one of us (R. B.
G.) thanks $\\ldots$''. Instead, try \`\`R. B. G. thanks$\\ldots$''. Put sponsor
acknowledgments in the unnumbered footnote on the first page.

\\section*{References}

Please number citations consecutively within brackets \\cite{b1}. The
sentence punctuation follows the bracket \\cite{b2}. Refer simply to the reference
number, as in \\cite{b3}---do not use \`\`Ref. \\cite{b3}'' or \`\`reference \\cite{b3}'' except at
the beginning of a sentence: \`\`Reference \\cite{b3} was the first $\\ldots$''

Number footnotes separately in superscripts. Place the actual footnote at
the bottom of the column in which it was cited. Do not put footnotes in the
abstract or reference list. Use letters for table footnotes.

Unless there are six authors or more give all authors' names; do not use
\`\`et al.''. Papers that have not been published, even if they have been
submitted for publication, should be cited as \`\`unpublished'' \\cite{b4}. Papers
that have been accepted for publication should be cited as \`\`in press'' \\cite{b5}.
Capitalize only the first word in a paper title, except for proper nouns and
element symbols.

For papers published in translation journals, please give the English
citation first, followed by the original foreign-language citation \\cite{b6}.

\\begin{thebibliography}{00}
\\bibitem{b1} G. Eason, B. Noble, and I. N. Sneddon, \`\`On certain integrals of Lipschitz-Hankel type involving products of Bessel functions,'' Phil. Trans. Roy. Soc. London, vol. A247, pp. 529--551, April 1955.
\\bibitem{b2} J. Clerk Maxwell, A Treatise on Electricity and Magnetism, 3rd ed., vol. 2. Oxford: Clarendon, 1892, pp.68--73.
\\bibitem{b3} I. S. Jacobs and C. P. Bean, \`\`Fine particles, thin films and exchange anisotropy,'' in Magnetism, vol. III, G. T. Rado and H. Suhl, Eds. New York: Academic, 1963, pp. 271--350.
\\bibitem{b4} K. Elissa, \`\`Title of paper if known,'' unpublished.
\\bibitem{b5} R. Nicole, \`\`Title of paper with only first word capitalized,'' J. Name Stand. Abbrev., in press.
\\bibitem{b6} Y. Yorozu, M. Hirano, K. Oka, and Y. Tagawa, \`\`Electron spectroscopy studies on magneto-optical media and plastic substrate interface,'' IEEE Transl. J. Magn. Japan, vol. 2, pp. 740--741, August 1987 [Digests 9th Annual Conf. Magnetics Japan, p. 301, 1982].
\\bibitem{b7} M. Young, The Technical Writer's Handbook. Mill Valley, CA: University Science, 1989.
\\end{thebibliography}
\\vspace{12pt}
\\color{red}
IEEE conference templates contain guidance text for composing and formatting conference papers. Please ensure that all template text is removed from your conference paper prior to submission to the conference. Failure to remove the template text from your paper may result in your paper not being published.

\\end{document}`

// Typst Templates

const typstBlankContent = `#set page(paper: "a4")
#set text(font: "Linux Libertine", size: 11pt)

= Document Title

== Introduction

This is a blank Typst document. You can start typing your content here.

== Section

Math is simple: $E=m c^2$.
`

const typstReportContent = `#set text(font: "Linux Libertine", size: 11pt)
#set page(numbering: "1")

#align(center + horizon)[
  #text(2em, weight: "bold")[Report Title]
  
  #v(2em)
  
  Author Name
  
  #datetime.today().display()
]

#pagebreak()

#outline()

#pagebreak()

= Introduction
This is the introduction.

= Methodology
This is the methodology.

= Results
This is the results section.

= Conclusion
This is the conclusion.
`

const typstResumeContent = `#import "@preview/basic-resume:0.2.9": *

#let name = "Your Name"
#let location = "City, State"
#let email = "your.email@example.com"
#let github = "github.com/yourusername"
#let linkedin = "linkedin.com/in/yourusername"
#let phone = "+1 (xxx) xxx-xxxx"
#let personal-site = "yoursite.dev"

#show: resume.with(
  author: name,
  location: location,
  email: email,
  github: github,
  linkedin: linkedin,
  phone: phone,
  personal-site: personal-site,
  accent-color: "#26428b",
  font: "New Computer Modern",
  paper: "us-letter",
  author-position: left,
  personal-info-position: left,
)

== Education

#edu(
  institution: "University Name",
  location: "City, State",
  dates: dates-helper(start-date: "Aug 2023", end-date: "May 2027"),
  degree: "Bachelor's of Science, Computer Science",
)
- Cumulative GPA: 4.0\\/4.0 | Dean's List, Merit Scholarship
- Relevant Coursework: Data Structures, Algorithms, Linear Algebra, Discrete Mathematics

== Work Experience

#work(
  title: "Software Engineer",
  location: "City, State",
  company: "Company Name",
  dates: dates-helper(start-date: "May 2024", end-date: "Present"),
)
- Developed and maintained key features for the company's flagship product
- Optimized database queries reducing response time by 40%
- Collaborated with cross-functional teams to deliver projects on schedule

#work(
  title: "Software Engineering Intern",
  location: "City, State",
  company: "Another Company",
  dates: dates-helper(start-date: "Jun 2023", end-date: "Aug 2023"),
)
- Built RESTful APIs serving 10,000+ daily requests
- Implemented automated testing pipeline increasing code coverage to 85%
- Contributed to open-source libraries used by the engineering team

== Projects

#project(
  name: "Project Name",
  role: "Creator",
  dates: dates-helper(start-date: "Nov 2023", end-date: "Present"),
  url: "github.com/yourusername/project",
)
- Built a full-stack web application with TypeScript, React, and PostgreSQL
- Implemented CI/CD pipeline with automated testing and deployment
- Achieved 99.9% uptime serving 1,000+ daily active users

== Skills
- *Programming Languages*: JavaScript, Python, TypeScript, Java, C++, SQL
- *Technologies*: React, Node.js, PostgreSQL, Docker, Git, AWS, Linux
`

const typstCoverLetterContent = `#import "@preview/fontawesome:0.6.0": *
#import "@preview/modernpro-coverletter:0.0.8": *

#show: coverletter.with(
  font-type: "PT Serif",
  name: [Your Name],
  address: [],
  contacts: (
    (text: [#fa-icon("location-dot") City, State]),
    (text: [123-456-7890], link: "tel:123-456-7890"),
    (text: [your.email\\@example.com], link: "mailto:your.email@example.com"),
    (text: [github.com/yourusername], link: "https://github.com/yourusername"),
  ),
  recipient: (
    start-title: [Dear Hiring Manager,],
    cl-title: [Application for Software Engineer],
    date: [],
    department: [Department of Engineering],
    institution: [Company Name],
    address: [City, State],
    postcode: [],
  ),
)

I am writing to express my interest in the Software Engineer position at Company Name. With my background in computer science and experience in software development, I believe I would be a valuable addition to your team.

In my current role, I have gained extensive experience in developing and maintaining web applications. I have worked with modern technologies including React, Node.js, and cloud platforms, delivering high-quality solutions that serve thousands of users daily.

I am particularly drawn to Company Name because of your commitment to innovation and the opportunity to work on impactful projects. I am confident that my skills and enthusiasm would allow me to contribute meaningfully to your team.

Thank you for considering my application. I look forward to the opportunity to discuss how my experience and skills align with your needs.
`

const typstIeeeContent = `#import "@preview/charged-ieee:0.1.4": ieee

#show: ieee.with(
  title: [Your Paper Title],
  abstract: [
    Your abstract goes here. Briefly describe the problem you are addressing,
    your approach, and your key findings. The abstract should be concise and
    self-contained, typically between 150-250 words.
  ],
  authors: (
    (
      name: "Author Name",
      department: [Department],
      organization: [Organization],
      location: [City, Country],
      email: "author@example.com"
    ),
  ),
  index-terms: ("First term", "Second term", "Third term"),
)

= Introduction
Your introduction goes here. Describe the problem, motivation, and contributions of your work.

= Related Work
Discuss relevant prior work and how your approach differs from existing solutions.

= Methodology
Describe your approach in detail. Include any algorithms, models, or frameworks used.

= Results
Present your findings and experimental results. Use tables and figures to illustrate key points.

= Conclusion
Summarize your work and discuss future directions.
`

const typstPresentationContent = `#import "@preview/touying:0.6.1": *
#import themes.simple: *

#show: simple-theme.with(
  aspect-ratio: "16-9",
)

= Welcome

== Introduction

Hello, welcome to this presentation!

This is built with *Touying*, a powerful presentation framework for Typst.

#pause

Use the pause function to reveal content step by step.

== Key Features

- Simple and clean slides
- Support for animations
- Multiple built-in themes
- Easy to customize

== Math Support

Typst makes math easy:

$ integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 $

== Thank You

Questions?
`

const typstHomeworkContent = `#import "@preview/academic-alt:0.1.0": *

#show: university-assignment.with(
  title: "Assignment Title",
  subtitle: "Course Subtitle",
  author: "Your Name",
  details: (
    course: "CS 101",
    instructor: "Prof. Smith",
    due-date: "September 19, 2025",
  )
)

= Problem 1

Your solution goes here.

$ f(x) = x^2 + 2x + 1 $

= Problem 2

Describe your approach and solution.

== Part A

Solution for Part A.

== Part B

Solution for Part B.

= Problem 3

Final problem solution.

= Conclusion

Summary of findings.
`

export const templateContent = {
  article: blankContent,
  report: reportContent,
  resume: resumeContent,
  letter: letterContent,
  proposal: proposalContent,
  presentation: presentationContent,
  presentation_classic: presentationClassicContent,
  assignment: assignmentContent,
  ieee_conf: ieeeConfContent,
  blank: blankContent,
}

export const typstTemplateContent: Record<string, string> = {
  blank: typstBlankContent,
  report: typstReportContent,
  resume: typstResumeContent,
  cover_letter: typstCoverLetterContent,
  ieee: typstIeeeContent,
  presentation: typstPresentationContent,
  homework: typstHomeworkContent,
}

/**
 * Templates that reference image files which need placeholder PNGs
 * created during project initialization.
 */
export const templatePlaceholderFiles: Record<string, string[]> = {
  ieee_conf: ['fig1.png'],
}

export interface Template {
  id: string
  title: string
  image: string
  type?: 'latex' | 'typst'
  description?: string
}

export const latexTemplates = [
  { id: 'blank', title: 'Blank Project', description: 'Start from scratch', image: '/tex/blank_preview.webp' },
  { id: 'article', title: 'Article', description: 'Standard academic article', image: '/tex/article_preview.webp' },
  { id: 'report', title: 'Report', description: 'Longer documents with chapters', image: '/tex/report_preview.webp' },
  { id: 'resume', title: 'Resume', description: 'Professional CV template', image: '/tex/resume_preview.webp' },
  { id: 'letter', title: 'Cover Letter', description: 'Professional letter format', image: '/tex/letter_preview.webp' },
  { id: 'proposal', title: 'Proposal', description: 'Project proposal template', image: '/tex/proposal_preview.webp' },
  { id: 'presentation', title: 'Presentation', description: 'Modern Metropolis theme', image: '/tex/presentation_preview.svg' },
  { id: 'presentation_classic', title: 'Presentation (Classic)', description: 'Classic Madrid theme', image: '/tex/presentation_classic_preview.svg' },
  { id: 'assignment', title: 'Assignment', description: 'Homework & problem sets', image: '/tex/assignment_preview.svg' },
  { id: 'ieee_conf', title: 'IEEE Conference', description: 'IEEE conference paper', image: '/tex/ieee_preview.svg' },
]

export const typstTemplates = [
  { id: 'blank', title: 'Blank Project', description: 'Start from scratch', image: '/typst/typst_blank_preview.svg' },
  { id: 'report', title: 'Report', description: 'Standard report template', image: '/typst/typst_report_preview.svg' },
  { id: 'resume', title: 'Resume', description: 'Professional CV with basic-resume', image: '/typst/typst_resume_preview.svg' },
  { id: 'cover_letter', title: 'Cover Letter', description: 'Modern cover letter', image: '/typst/typst_cover_letter_preview.svg' },
  { id: 'ieee', title: 'IEEE Paper', description: 'IEEE conference paper', image: '/typst/typst_ieee_preview.svg' },
  { id: 'presentation', title: 'Presentation', description: 'Slide deck with Touying', image: '/typst/typst_presentation_preview.svg' },
  { id: 'homework', title: 'Homework', description: 'Assignment & problem sets', image: '/typst/typst_homework_preview.svg' },
]
