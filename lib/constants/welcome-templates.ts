// Welcome document templates for new users

export const typstWelcomeContent = `// Clarity Welcome Document - Typst Edition
// This document showcases Typst's features and syntax

#set page(
  paper: "a4",
  margin: (x: 1.5cm, y: 2cm),
)

#set text(
  font: "Linux Libertine",
  size: 11pt,
)

#set par(justify: true)

#align(center)[
  #text(size: 24pt, weight: "bold")[Welcome to Clarity]
  
  #v(0.5em)
  
  #text(size: 16pt)[AI Collaborative Scientific Editor]
  
  #v(0.3em)
  
  #text(size: 12pt, style: "italic")[Supporting Both LaTeX and Typst]
]

#v(1em)

= Introduction

Welcome to *Clarity*, your intelligent companion for scientific writing. Clarity supports both LaTeX and Typst, giving you the flexibility to choose the typesetting system that best suits your workflow. This document introduces you to Typst—a modern, fast, and intuitive markup-based typesetting system.

= Why Choose Typst?

Typst offers several compelling advantages for scientific and technical writing:

== Immediate Rendering

One of Typst's most powerful features is its *instant preview*. Unlike traditional LaTeX workflows where compilation can take seconds or even minutes for large documents, Typst renders your changes in real-time. This means you can see your document update as you type, creating a seamless writing experience that bridges the gap between what you write and what you get.

== Clean and Intuitive Syntax

Typst's syntax is designed to be both powerful and easy to learn. Instead of verbose LaTeX commands, Typst uses lightweight markup combined with a consistent function-based system:

- Headings: Use \`=\` for top-level headings, \`==\` for subheadings, and so on
- Emphasis: Wrap text in \`_underscores_\` for _italic_ or \`*asterisks*\` for *bold*
- Lists: Start lines with \`-\` or \`+\` for bullet points and numbered lists
- Functions: Use \`#\` to call functions like \`#figure()\`, \`#table()\`, or \`#image()\`

== Powerful Scripting

Typst integrates a full scripting language, allowing you to automate repetitive tasks, create reusable templates, and build dynamic content. You can define variables, write functions, and use conditionals and loops—all within your document.

= Getting Started with Typst Syntax

Let's explore some fundamental Typst syntax elements:

== Text Formatting

You can easily format text using simple markup:

- _Italic text_ with underscores
- *Bold text* with asterisks
- \`Monospace text\` with backticks
- #underline[Underlined text] using the underline function
- #text(fill: blue)[Colored text] with the text function

== Lists and Structure

Typst supports both unordered and ordered lists:

=== Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

=== Ordered Lists

+ First step
+ Second step
  + Substep A
  + Substep B
+ Third step

== Code Blocks

You can include code snippets with syntax highlighting:
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

= Mathematical Typesetting in Typst

Mathematics is a first-class citizen in Typst, with elegant and intuitive syntax.

== Inline Mathematics

Mathematical expressions can be embedded inline using dollar signs. For example, the famous equation $E = m c^2$ demonstrates Einstein's mass-energy equivalence. You can also write expressions like $a^2 + b^2 = c^2$ for the Pythagorean theorem.

== Display Mathematics

For standalone equations, add spaces inside the dollar signs to create a display block:

$ 
integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 
$

== Mathematical Syntax Features

Typst's math mode includes intuitive syntax for common mathematical constructs:

=== Fractions and Roots

Fractions use the forward slash, and roots have dedicated syntax:

$
f(x) = (x^2 + 2x + 1) / (x - 1) = sqrt(x^4 + x^2)
$

=== Subscripts and Superscripts

Use underscore for subscripts and caret for superscripts:

$
x_1, x_2, ..., x_n "and" y^(n+1) = y^n dot y
$

=== Summations and Integrals

Typst provides natural syntax for sums, integrals, and limits:

$
sum_(i=1)^n i = (n(n+1)) / 2
$

$
integral_a^b f(x) dif x = F(b) - F(a)
$

$
lim_(x -> infinity) (1 + 1/x)^x = e
$

=== Matrices and Vectors

Create matrices using the \`mat()\` function with semicolons to separate rows:

$
A = mat(
  a_(1,1), a_(1,2), a_(1,3);
  a_(2,1), a_(2,2), a_(2,3);
  a_(3,1), a_(3,2), a_(3,3);
)
$

Vectors can be created similarly:

$
arrow(v) = vec(x, y, z) "and" arrow(u) dot arrow(v) = x_1 x_2 + y_1 y_2 + z_1 z_2
$

=== Multi-line Equations with Alignment

Use the ampersand (\`&\`) for alignment points in multi-line equations:

$
f(x) &= (x + 1)^2 \\
     &= x^2 + 2x + 1 \\
     &= x^2 + 2x + 1
$

=== Greek Letters and Symbols

Typst provides extensive symbol support using descriptive names:

$
alpha, beta, gamma, delta, epsilon, zeta, eta, theta \\
Alpha, Beta, Gamma, Delta, integral, sum, product, union, sect
$

Common mathematical symbols:

$
infinity, partial, nabla, exists, forall, in, subset, arrow.r, equiv
$

== Numbered Equations

You can number equations and reference them:

#set math.equation(numbering: "(1)")

The quadratic formula solves equations of the form $a x^2 + b x + c = 0$:

$ 
x = (-b plus.minus sqrt(b^2 - 4a c)) / (2a) 
$ <quadratic>

Later in your document, you can reference @quadratic to discuss the quadratic formula.

= Advanced Features

== Set Rules

Typst's *set rules* allow you to configure document properties globally:
\`\`\`typ
#set text(size: 12pt, font: "New Computer Modern")
#set par(leading: 0.65em, justify: true)
#set page(numbering: "1")
\`\`\`

== Show Rules

*Show rules* let you completely customize how elements appear:
\`\`\`typ
#show heading.where(level: 1): it => {
  set text(size: 18pt, weight: "bold", fill: blue)
  smallcaps(it.body)
}
\`\`\`

== Functions and Variables

Define reusable content and computations:
\`\`\`typ
#let author-name = "Dr. Jane Smith"
#let format-date(date) = {
  date.display("[day] [month repr:long] [year]")
}
\`\`\`

= Mathematical Examples

Let's demonstrate more complex mathematical typesetting:

== Calculus

The fundamental theorem of calculus states:

$
integral_a^b f'(x) dif x = f(b) - f(a)
$

For partial derivatives:

$
(partial f) / (partial x) = lim_(h -> 0) (f(x + h, y) - f(x, y)) / h
$

== Linear Algebra

The determinant of a 2×2 matrix:

$
det mat(a, b; c, d) = a d - b c
$

Eigenvalue equation:

$
A arrow(v) = lambda arrow(v)
$

== Statistics and Probability

The normal distribution probability density function:

$
f(x | mu, sigma^2) = 1/(sqrt(2 pi sigma^2)) e^(-(x - mu)^2 / (2 sigma^2))
$

== Complex Equations

Maxwell's equations in differential form:

$
nabla dot arrow(E) &= rho / epsilon_0 \\
nabla dot arrow(B) &= 0 \\
nabla times arrow(E) &= -(partial arrow(B)) / (partial t) \\
nabla times arrow(B) &= mu_0 arrow(J) + mu_0 epsilon_0 (partial arrow(E)) / (partial t)
$

= Conclusion

Typst combines the power of LaTeX with modern design principles, offering:

- *Speed*: Instant compilation and preview
- *Simplicity*: Intuitive syntax that's easy to learn
- *Flexibility*: Full scripting capabilities for automation
- *Beauty*: Professional typographic quality out of the box

In Clarity, you have the freedom to choose between LaTeX and Typst based on your needs. Whether you're writing a quick research note or a comprehensive dissertation, Clarity's AI assistance combined with Typst's modern approach makes scientific writing more efficient and enjoyable.

#align(center)[
  #text(size: 14pt, weight: "bold")[Happy Writing with Clarity!]
]

#v(2em)

#align(center)[
  #text(size: 10pt, style: "italic")[
    For more information about Typst syntax and features, visit #link("https://typst.app/docs/")
  ]
]`

export const latexWelcomeContent = `% Clarity Welcome Document - LaTeX Edition
% This document showcases LaTeX's features and syntax

\\documentclass[11pt, a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{geometry}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{listings}

\\geometry{margin=2cm}

\\title{\\textbf{Welcome to Clarity}}
\\author{AI Collaborative Scientific Editor \\\\ \\textit{Supporting Both LaTeX and Typst}}
\\date{}

\\begin{document}

\\maketitle

\\section{Introduction}

Welcome to \\textbf{Clarity}, your intelligent companion for scientific writing. Clarity supports both LaTeX and Typst, giving you the flexibility to choose the typesetting system that best suits your workflow. This document introduces you to LaTeX—the gold standard in scientific and academic typesetting for over three decades.

\\section{Why Choose LaTeX?}

LaTeX offers several compelling advantages for scientific and technical writing:

\\subsection{Industry Standard}

LaTeX is the \\textit{de facto} standard in academia, particularly in mathematics, physics, computer science, and engineering. Most scientific journals, conference proceedings, and academic institutions use LaTeX for document preparation.

\\subsection{Exceptional Quality}

LaTeX produces documents with professional typographic quality, handling complex mathematical equations, cross-references, bibliographies, and figures with precision and elegance.

\\subsection{Mature Ecosystem}

With decades of development, LaTeX has an extensive ecosystem of packages and tools for virtually any document preparation need—from simple articles to complex books, presentations, and posters.

\\section{Getting Started with LaTeX Syntax}

Let's explore fundamental LaTeX syntax elements:

\\subsection{Text Formatting}

You can format text using various commands:

\\begin{itemize}
    \\item \\textit{Italic text} with \\texttt{\\textbackslash textit\\{\\}}
    \\item \\textbf{Bold text} with \\texttt{\\textbackslash textbf\\{\\}}
    \\item \\texttt{Monospace text} with \\texttt{\\textbackslash texttt\\{\\}}
    \\item \\underline{Underlined text} with \\texttt{\\textbackslash underline\\{\\}}
    \\item \\textcolor{blue}{Colored text} with \\texttt{\\textbackslash textcolor\\{\\}\\{\\}}
\\end{itemize}

\\subsection{Lists and Structure}

LaTeX supports both unordered and ordered lists:

\\subsubsection{Unordered Lists}

\\begin{itemize}
    \\item First item
    \\item Second item
    \\begin{itemize}
        \\item Nested item
        \\item Another nested item
    \\end{itemize}
    \\item Third item
\\end{itemize}

\\subsubsection{Ordered Lists}

\\begin{enumerate}
    \\item First step
    \\item Second step
    \\begin{enumerate}
        \\item Substep A
        \\item Substep B
    \\end{enumerate}
    \\item Third step
\\end{enumerate}

\\subsection{Code Blocks}

You can include code snippets:

\\begin{verbatim}
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\\end{verbatim}

\\section{Mathematical Typesetting in LaTeX}

Mathematics is where LaTeX truly excels, with comprehensive and powerful syntax.

\\subsection{Inline Mathematics}

Mathematical expressions can be embedded inline using dollar signs. For example, the famous equation $E = mc^2$ demonstrates Einstein's mass-energy equivalence. You can also write expressions like $a^2 + b^2 = c^2$ for the Pythagorean theorem.

\\subsection{Display Mathematics}

For standalone equations, use display environments:

\\[
\\int_0^\\infty e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}
\\]

\\subsection{Mathematical Syntax Features}

\\subsubsection{Fractions and Roots}

Fractions use \\texttt{\\textbackslash frac}, and roots use \\texttt{\\textbackslash sqrt}:

\\[
f(x) = \\frac{x^2 + 2x + 1}{x - 1} = \\sqrt{x^4 + x^2}
\\]

\\subsubsection{Subscripts and Superscripts}

Use underscore for subscripts and caret for superscripts:

\\[
x_1, x_2, \\ldots, x_n \\text{ and } y^{n+1} = y^n \\cdot y
\\]

\\subsubsection{Summations and Integrals}

LaTeX provides commands for sums, integrals, and limits:

\\[
\\sum_{i=1}^n i = \\frac{n(n+1)}{2}
\\]

\\[
\\int_a^b f(x) \\, dx = F(b) - F(a)
\\]

\\[
\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x = e
\\]

\\subsubsection{Matrices and Vectors}

Create matrices using various environments:

\\[
A = \\begin{pmatrix}
a_{1,1} & a_{1,2} & a_{1,3} \\\\
a_{2,1} & a_{2,2} & a_{2,3} \\\\
a_{3,1} & a_{3,2} & a_{3,3}
\\end{pmatrix}
\\]

Vectors can be created similarly:

\\[
\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} \\text{ and } \\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 + z_1 z_2
\\]

\\subsubsection{Multi-line Equations with Alignment}

Use the \\texttt{align} environment for aligned equations:

\\begin{align*}
f(x) &= (x + 1)^2 \\\\
     &= x^2 + 2x + 1 \\\\
     &= x^2 + 2x + 1
\\end{align*}

\\subsubsection{Greek Letters and Symbols}

LaTeX provides extensive symbol support:

\\[
\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\zeta, \\eta, \\theta, \\Gamma, \\Delta, \\int, \\sum, \\prod, \\cup, \\cap
\\]

Common mathematical symbols:

\\[
\\infty, \\partial, \\nabla, \\exists, \\forall, \\in, \\subset, \\rightarrow, \\equiv
\\]

\\subsection{Numbered Equations}

Equations are automatically numbered and can be referenced:

The quadratic formula solves equations of the form $ax^2 + bx + c = 0$:

\\begin{equation}
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\label{eq:quadratic}
\\end{equation}

Later, you can reference Equation~\\ref{eq:quadratic} to discuss the quadratic formula.

\\section{Mathematical Examples}

Let's demonstrate more complex mathematical typesetting:

\\subsection{Calculus}

The fundamental theorem of calculus states:

\\[
\\int_a^b f'(x) \\, dx = f(b) - f(a)
\\]

For partial derivatives:

\\[
\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x + h, y) - f(x, y)}{h}
\\]

\\subsection{Linear Algebra}

The determinant of a $2 \\times 2$ matrix:

\\[
\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc
\\]

Eigenvalue equation:

\\[
A\\vec{v} = \\lambda\\vec{v}
\\]

\\subsection{Statistics and Probability}

The normal distribution probability density function:

\\[
f(x | \\mu, \\sigma^2) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x - \\mu)^2}{2\\sigma^2}}
\\]

\\subsection{Complex Equations}

Maxwell's equations in differential form:

\\begin{align*}
\\nabla \\cdot \\vec{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\vec{B} &= 0 \\\\
\\nabla \\times \\vec{E} &= -\\frac{\\partial \\vec{B}}{\\partial t} \\\\
\\nabla \\times \\vec{B} &= \\mu_0 \\vec{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}
\\end{align*}

\\section{Conclusion}

LaTeX remains the gold standard for scientific writing, offering:

\\begin{itemize}
    \\item \\textbf{Quality}: Professional typographic output
    \\item \\textbf{Stability}: Proven reliability over decades
    \\item \\textbf{Compatibility}: Wide acceptance in academia
    \\item \\textbf{Extensibility}: Thousands of packages for specialized needs
\\end{itemize}

In Clarity, you have the freedom to choose between LaTeX and Typst based on your needs. Whether you're writing a quick research note or a comprehensive dissertation, Clarity's AI assistance makes scientific writing more efficient and enjoyable.

\\vspace{2em}

\\begin{center}
\\textbf{\\Large Happy Writing with Clarity!}
\\end{center}

\\vspace{1em}

\\begin{center}
\\textit{For more information about LaTeX, visit \\href{https://www.latex-project.org/}{latex-project.org}}
\\end{center}

\\end{document}`
