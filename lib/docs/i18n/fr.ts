import type { DocsLocaleData } from './types'

const fr: DocsLocaleData = {
  navTitles: {
    'introduction': 'Introduction',
    'getting-started': 'Premiers pas',
    'editor': 'Éditeur',
    'editor/latex': 'Support LaTeX',
    'editor/typst': 'Support Typst',
    'editor/pdf-preview': 'Aperçu PDF',
    'editor/file-management': 'Gestion des fichiers',
    'editor/keyboard-shortcuts': 'Raccourcis clavier',
    'ai-assistant': 'Assistant IA',
    'ai-assistant/chat': 'Interface de chat',
    'ai-assistant/smart-editing': 'Édition intelligente',
    'ai-assistant/error-fixing': 'Correction d\'erreurs',
    'ai-assistant/typst-library': 'Bibliothèque Typst',
    'collaboration': 'Collaboration',
    'collaboration/real-time': 'Édition en temps réel',
    'collaboration/sharing': 'Partage et permissions',
    'collaboration/comments': 'Commentaires et fils de discussion',
    'projects': 'Projets',
    'projects/dashboard': 'Tableau de bord',
    'projects/templates': 'Modèles',
    'mcp': 'Intégration MCP',
    'mcp/setup': 'Guide d\'installation',
    'mcp/tools': 'Référence des outils',
    'mcp/security': 'Clés API et sécurité',
    'settings': 'Paramètres',
    'billing': 'Facturation et forfaits',
    'faq': 'FAQ',
  },

  pages: {
    'introduction': {
      title: 'Introduction',
      description: 'Bienvenue sur Clarity — un éditeur scientifique collaboratif propulsé par l\'IA.',
      content: `Clarity est un **éditeur scientifique collaboratif propulsé par l'IA**, conçu pour les chercheurs, les professeurs et les étudiants. Il prend en charge **LaTeX** et **Typst**, compile les documents dans le cloud et permet aux équipes de travailler ensemble en temps réel.

> **Tip:** Vous découvrez Clarity ? Rendez-vous sur le guide Premiers pas pour créer votre premier projet en moins d'une minute.

## Pourquoi Clarity ?

Les éditeurs scientifiques traditionnels vous obligent à jongler entre les installations locales, les paquets obsolètes et le contrôle de version manuel. Clarity élimine tout cela :

- **Aucune installation requise** — ouvrez votre navigateur et commencez à écrire
- **Compilation dans le cloud** — PDF générés en millisecondes, paquets gérés automatiquement
- **Copilote IA** — corrigez les erreurs, générez des tableaux, reformulez des sections sans quitter l'éditeur
- **Collaboration en temps réel** — curseurs en direct, synchronisation instantanée, zéro conflit de fusion
- **LaTeX et Typst** — écrivez dans le langage de votre choix

## À qui s'adresse Clarity ?

| Public | Cas d'utilisation |
|----------|----------|
| **Chercheurs** | Rédigez et itérez sur vos articles avec l'assistance de l'IA |
| **Professeurs** | Collaborez avec vos étudiants sur des documents partagés |
| **Étudiants** | Rédigez des thèses, des devoirs et des rapports de laboratoire |
| **Équipes** | Co-rédigez des articles avec l'édition en direct et les commentaires |

## Concepts fondamentaux

**Projets** — Chaque document se trouve dans un projet. Un projet peut contenir plusieurs fichiers organisés en dossiers, avec un fichier d'entrée principal (\`main.tex\` ou \`main.typ\`).

**Éditeur** — Un éditeur de code complet basé sur Monaco, avec coloration syntaxique, autocomplétion et détection d'erreurs en temps réel.

**Assistant IA** — Un panneau de chat intégré qui comprend le contexte de votre document et peut lire, modifier et créer des fichiers en votre nom.

**Collaboration** — Propulsée par Liveblocks et Yjs, permettant une édition en temps réel sans conflit avec détection de présence.`,
    },

    'getting-started': {
      title: 'Premiers pas',
      description: 'Créez votre premier projet et compilez votre premier document en moins d\'une minute.',
      content: `## 1. Inscription

Rendez-vous sur la page d'accueil de Clarity et cliquez sur **Get Started Now**. Vous pouvez vous inscrire avec votre adresse e-mail ou utiliser une connexion via un réseau social.

> **Info:** Le forfait gratuit vous offre un projet, un accès complet à l'éditeur et la compilation dans le cloud — aucune carte bancaire requise.

## 2. Créer un projet

Depuis le **Tableau de bord**, cliquez sur le bouton **New Project**. Vous pourrez :

- Partir d'un **projet vierge** (LaTeX ou Typst)
- Choisir parmi une bibliothèque de **modèles** (article de recherche, thèse, présentation, etc.)
- Nommer votre projet et définir la langue du document

## 3. Rédiger votre document

L'éditeur s'ouvre en vue partagée :

| Panneau gauche | Panneau droit |
|------------|-------------|
| **Éditeur de code source** — rédigez votre code LaTeX ou Typst | **Aperçu PDF** — visualisez le résultat compilé |

L'arborescence de fichiers dans la barre latérale gauche vous permet de naviguer entre les fichiers, d'en créer de nouveaux et d'organiser les dossiers.

## 4. Compiler

Cliquez sur le bouton **Compile** (ou utilisez le raccourci clavier) pour générer votre PDF. Le moteur cloud de Clarity :

- Gère automatiquement toutes les installations de paquets
- Compile en millisecondes
- Affiche les erreurs en ligne avec des messages explicites

## 5. Collaborer

Cliquez sur **Share** en haut à droite pour inviter des collaborateurs. Vous pouvez définir les permissions :

- **Viewer** — accès en lecture seule
- **Commenter** — lecture + commentaires
- **Editor** — accès complet en lecture/écriture

## 6. Utiliser l'assistant IA

Ouvrez le panneau de chat IA depuis la barre latérale. Demandez-lui de :

- Corriger les erreurs de compilation
- Générer un tableau à partir d'une description
- Reformuler un paragraphe pour plus de clarté
- Rechercher dans les fichiers de votre projet

> **Tip:** L'assistant IA a un accès complet au contexte de votre projet. Vous pouvez lui poser des questions comme « Corrige l'erreur à la ligne 42 » et il lira le fichier, diagnostiquera le problème et proposera une correction.`,
    },

    'editor': {
      title: 'Présentation de l\'éditeur',
      description: 'Un éditeur de code puissant, basé sur le navigateur, conçu pour la rédaction scientifique.',
      content: `L'éditeur de Clarity est construit sur **Monaco** (le même moteur que VS Code), personnalisé pour la rédaction de documents scientifiques.

## Fonctionnalités principales

- **Coloration syntaxique** pour LaTeX et Typst
- **Détection d'erreurs en temps réel** avec diagnostics en ligne
- **Autocomplétion** pour les commandes, les environnements et les références
- **Repliement de code** pour réduire les sections
- **Correspondance des parenthèses** et fermeture automatique
- **Onglets multiples** pour une navigation rapide entre les fichiers
- **Support SyncTeX** — cliquez dans le PDF pour accéder au code source, et inversement

## Vue partagée

L'éditeur utilise une disposition partagée redimensionnable :

- **Gauche** : éditeur de code source
- **Droite** : aperçu PDF en direct

Vous pouvez faire glisser le séparateur pour redimensionner, ou utiliser la visionneuse PDF flottante pour une fenêtre d'aperçu détachée.

## Arborescence de fichiers

La barre latérale gauche affiche la structure de fichiers de votre projet. Vous pouvez :

- Créer de nouveaux fichiers et dossiers
- Renommer ou supprimer des fichiers
- Cliquer pour ouvrir des fichiers dans de nouveaux onglets
- Glisser-déposer pour réorganiser (à venir)`,
    },

    'editor/latex': {
      title: 'Support LaTeX',
      description: 'Support complet de LaTeX avec compilation dans le cloud et gestion automatique des paquets.',
      content: `Clarity offre un support de premier ordre pour LaTeX avec un moteur de compilation **texlive** basé dans le cloud.

## Compilation

Lorsque vous cliquez sur **Compile**, Clarity :

1. Synchronise les fichiers de votre projet avec le moteur cloud
2. Exécute \`latexmk\` dans un conteneur Docker avec une installation complète de texlive
3. Renvoie le PDF compilé en millisecondes
4. Met en cache le résultat pour accélérer les compilations suivantes

## Gestion automatique des paquets

Contrairement aux installations locales de LaTeX, vous n'avez jamais besoin d'installer manuellement des paquets. Le moteur de Clarity inclut la distribution texlive complète — chaque paquet est disponible immédiatement.

> **Info:** Plus besoin de \`tlmgr install\` ni d'attendre les mises à jour de paquets. Chaque paquet CTAN est pré-installé et prêt à l'emploi.

## Fonctionnalités prises en charge

- Toutes les classes de documents standard (\`article\`, \`report\`, \`book\`, \`beamer\`, etc.)
- BibTeX / BibLaTeX pour la gestion bibliographique
- TikZ et PGFPlots pour les diagrammes et graphiques
- \`amsmath\`, \`amssymb\` et autres paquets mathématiques
- Projets multi-fichiers avec \`\\input\` et \`\\include\`
- Fichiers \`.sty\` et \`.cls\` personnalisés

## Gestion des erreurs

Les erreurs de compilation apparaissent dans le panneau **Compile Logs** sous l'éditeur. Chaque erreur affiche :

- Le fichier et le numéro de ligne
- Le message d'erreur du moteur TeX
- Un lien cliquable pour accéder directement au code source

L'assistant IA peut également lire ces erreurs et suggérer des corrections automatiquement.`,
    },

    'editor/typst': {
      title: 'Support Typst',
      description: 'Composition scientifique moderne avec Typst — syntaxe simplifiée, compilation plus rapide.',
      content: `**Typst** est un langage de balisage moderne pour les documents scientifiques. Clarity prend en charge Typst en tant que citoyen de première classe aux côtés de LaTeX.

## Pourquoi Typst ?

- **Syntaxe simplifiée** — pas de barres obliques inverses, pas de \`\\begin{}\` / \`\\end{}\`
- **Compilation plus rapide** — compilations incrémentales en millisecondes
- **Fonctionnalités modernes** — scripts, styles et primitives de mise en page intégrés
- **Écosystème en croissance** — bibliothèque de paquets en expansion rapide

## Exemple

\`\`\`typst
#set page(paper: "a4")
#set text(font: "New Computer Modern", size: 11pt)

= Introduction

This is a paragraph with *emphasis* and a citation @einstein1905.

$ E = m c^2 $
\`\`\`

## Aperçu en direct

Les projets Typst bénéficient du **mode aperçu en direct** — le PDF se met à jour au fur et à mesure que vous tapez, sans étape de compilation explicite.

## Documentation de la bibliothèque Typst

L'assistant IA a accès à la documentation intégrée de Typst. Posez-lui une question sur n'importe quelle fonction ou syntaxe Typst, et il consultera la documentation officielle pour vous.`,
    },

    'editor/pdf-preview': {
      title: 'Aperçu PDF',
      description: 'Rendu PDF instantané avec support SyncTeX et visionneuse flottante.',
      content: `## Aperçu en vue partagée

Par défaut, l'aperçu PDF apparaît dans le panneau droit de la vue partagée. Il se met à jour automatiquement après chaque compilation.

## Visionneuse flottante

Cliquez sur l'icône **détacher** du panneau PDF pour ouvrir l'aperçu dans une fenêtre flottante. Cela vous donne plus d'espace à l'écran pour l'éditeur tout en gardant l'aperçu visible.

## SyncTeX

Clarity prend en charge **SyncTeX** — la liaison bidirectionnelle entre le code source et le résultat PDF :

- **Synchronisation avant** : cliquez sur une position dans l'éditeur pour mettre en surbrillance l'emplacement correspondant dans le PDF
- **Synchronisation inverse** : cliquez sur une position dans le PDF pour accéder à la ligne correspondante dans le code source

## Zoom et navigation

- Faites défiler pour naviguer entre les pages
- Utilisez le pincement pour zoomer ou les contrôles de zoom
- Miniatures de pages pour une navigation rapide dans les documents longs`,
    },

    'editor/file-management': {
      title: 'Gestion des fichiers',
      description: 'Organisez votre projet avec des fichiers, des dossiers et des documents multi-fichiers.',
      content: `## Arborescence de fichiers

L'arborescence de fichiers de la barre latérale affiche tous les fichiers de votre projet. Le **fichier d'entrée principal** (généralement \`main.tex\` ou \`main.typ\`) est détecté automatiquement.

## Créer des fichiers

Cliquez sur l'icône **+** dans l'en-tête de l'arborescence de fichiers pour créer :

- **Nouveau fichier** — spécifiez le nom du fichier et son extension
- **Nouveau dossier** — regroupez les fichiers associés

L'assistant IA peut également créer des fichiers pour vous via les outils \`create_file\` et \`create_folder\`.

## Types de fichiers pris en charge

| Extension | Utilisation |
|-----------|------------|
| \`.tex\` | Fichiers source LaTeX |
| \`.typ\` | Fichiers source Typst |
| \`.bib\` | Bases de données bibliographiques |
| \`.sty\` | Fichiers de style LaTeX |
| \`.cls\` | Fichiers de classe LaTeX |
| \`.png\`, \`.jpg\`, \`.pdf\` | Images et figures |

## Projets multi-fichiers

Pour les documents plus volumineux, répartissez votre travail sur plusieurs fichiers :

- Utilisez \`\\input{chapter1.tex}\` en LaTeX
- Utilisez \`#include "chapter1.typ"\` en Typst

Clarity compile à partir du fichier d'entrée principal et résout automatiquement toutes les inclusions.`,
    },

    'editor/keyboard-shortcuts': {
      title: 'Raccourcis clavier',
      description: 'Accélérez votre flux de travail grâce aux raccourcis clavier.',
      content: `## Général

| Raccourci | Action |
|----------|--------|
| \`Ctrl/Cmd + S\` | Enregistrer le fichier |
| \`Ctrl/Cmd + Enter\` | Compiler le document |
| \`Ctrl/Cmd + /\` | Basculer le commentaire |
| \`Ctrl/Cmd + Z\` | Annuler |
| \`Ctrl/Cmd + Shift + Z\` | Rétablir |
| \`Ctrl/Cmd + F\` | Rechercher |
| \`Ctrl/Cmd + H\` | Rechercher et remplacer |

## Navigation dans l'éditeur

| Raccourci | Action |
|----------|--------|
| \`Ctrl/Cmd + G\` | Aller à la ligne |
| \`Ctrl/Cmd + P\` | Ouverture rapide de fichier |
| \`Ctrl/Cmd + Shift + O\` | Aller au symbole |
| \`Alt + Up/Down\` | Déplacer la ligne vers le haut/bas |
| \`Ctrl/Cmd + D\` | Sélectionner l'occurrence suivante |

## Assistant IA

| Raccourci | Action |
|----------|--------|
| \`Ctrl/Cmd + L\` | Ouvrir le chat IA |
| \`Ctrl/Cmd + K\` | Édition rapide en ligne |`,
    },

    'ai-assistant': {
      title: 'Présentation de l\'assistant IA',
      description: 'Votre copilote intelligent pour la rédaction scientifique.',
      content: `L'assistant IA de Clarity est un copilote intégré qui comprend votre document et peut vous aider à rédiger, modifier et déboguer — le tout sans quitter l'éditeur.

## Capacités

L'assistant peut :

- **Lire** n'importe quel fichier de votre projet
- **Rechercher** dans tous les fichiers du projet
- **Modifier** des fichiers avec des opérations de recherche et remplacement précises
- **Créer** de nouveaux fichiers et dossiers
- **Compiler** votre document et lire les journaux d'erreurs
- **Consulter** la documentation Typst

## Fonctionnement

L'assistant IA a accès à un ensemble d'**outils** qui lui permettent d'interagir avec votre espace de travail :

| Outil | Description |
|------|-------------|
| \`read_workspace_file\` | Lire le contenu de n'importe quel fichier du projet |
| \`search_workspace\` | Recherche en texte intégral dans tous les fichiers |
| \`apply_file_edit\` | Effectuer des modifications ciblées par recherche/remplacement |
| \`batch_apply_edits\` | Appliquer plusieurs modifications en séquence |
| \`create_file\` | Créer de nouveaux fichiers avec du contenu |
| \`create_folder\` | Créer de nouveaux répertoires |
| \`delete_file\` | Supprimer des fichiers |
| \`get_compile_logs\` | Lire les erreurs de compilation |
| \`list_typst_skill_docs\` | Parcourir la documentation Typst |

## Gestion des modifications

> **Warning:** L'IA ne modifiera jamais vos fichiers sans votre approbation explicite. Chaque modification passe par une révision par étapes.

Chaque modification effectuée par l'IA passe par un **flux d'approbation par étapes** :

1. L'IA propose des modifications
2. Vous voyez un aperçu des différences dans la **barre de modifications en attente**
3. Vous approuvez ou rejetez chaque modification
4. Un point de contrôle est créé pour vous permettre d'annuler ultérieurement`,
    },

    'ai-assistant/chat': {
      title: 'Interface de chat',
      description: 'Conversez avec l\'IA pour obtenir de l\'aide sur votre document.',
      content: `## Ouvrir le chat

Cliquez sur l'icône **AI** dans la barre latérale ou utilisez le raccourci clavier \`Ctrl/Cmd + L\` pour ouvrir le panneau de chat.

## Poser des questions

Tapez votre question ou votre demande dans le champ de saisie. L'IA a un accès complet au contexte de :

- Votre fichier actuel et la position du curseur
- Tous les fichiers du projet
- Les erreurs de compilation récentes
- La structure de votre projet

## Exemples de requêtes

- *« Ajoute un tableau comparant ces trois méthodes »*
- *« Corrige l'erreur de compilation à la ligne 42 »*
- *« Reformule l'introduction pour la rendre plus concise »*
- *« Crée un nouveau fichier appelé appendix.tex avec un modèle »*
- *« De quels paquets ai-je besoin pour ce diagramme TikZ ? »*

## Réponses en continu

L'IA diffuse sa réponse en temps réel. Vous verrez :

- Du texte formaté en Markdown avec coloration syntaxique
- Des blocs de code en ligne pour les extraits LaTeX/Typst
- Des modifications en attente qui apparaissent dans l'éditeur avec une mise en surbrillance des différences
- Des appels d'outils montrant ce que l'IA fait (lecture de fichiers, recherche, etc.)

## Historique des messages

L'historique de votre conversation est sauvegardé par projet. Vous pouvez faire défiler vers le haut pour consulter les messages précédents et reprendre la conversation là où vous l'avez laissée.`,
    },

    'ai-assistant/smart-editing': {
      title: 'Édition intelligente',
      description: 'Recherche et remplacement propulsés par l\'IA avec correspondance approximative.',
      content: `## Fonctionnement

Lorsque vous demandez à l'IA de modifier votre document, elle utilise un système de **recherche et remplacement intelligent** :

1. L'IA identifie le texte à modifier
2. Elle utilise la correspondance approximative pour trouver l'emplacement exact (tolérante aux différences d'espacement)
3. Elle propose le texte de remplacement
4. Vous voyez un aperçu des différences avant que la modification ne soit appliquée

## Modifications par lot

L'IA peut appliquer plusieurs modifications en une seule opération en utilisant \`batch_apply_edits\`. Chaque modification est validée indépendamment, et vous pouvez les approuver ou les rejeter individuellement.

## Mode d'édition rapide

Pour les petites modifications en ligne, l'IA peut utiliser le **mode d'édition rapide** — un flux d'édition léger qui affiche les modifications directement dans l'éditeur avec une mise en surbrillance en vert (ajouté) et en rouge (supprimé).

## Mode planification

Pour les opérations plus importantes, l'IA peut passer en **mode planification** :

1. Elle lit d'abord vos fichiers (en lecture seule)
2. Présente un plan des modifications proposées
3. Vous approuvez le plan
4. Elle exécute toutes les modifications en séquence

Cela garantit que vous avez toujours une visibilité sur ce que l'IA va faire avant qu'elle ne le fasse.`,
    },

    'ai-assistant/error-fixing': {
      title: 'Correction d\'erreurs',
      description: 'Diagnostiquez et corrigez automatiquement les erreurs de compilation.',
      content: `## Détection automatique des erreurs

Lorsque la compilation échoue, l'IA peut :

1. Lire les **journaux de compilation** pour comprendre l'erreur
2. Identifier le fichier et la ligne à l'origine du problème
3. Proposer une correction
4. L'appliquer avec votre approbation

## Corrections courantes

L'IA gère un large éventail d'erreurs LaTeX et Typst :

- **Paquets manquants** — suggère la commande \`\\usepackage\` appropriée
- **Erreurs de syntaxe** — corrige les accolades non appariées, les balises \`\\end{}\` manquantes
- **Commandes non définies** — suggère des alternatives ou des importations de paquets
- **Erreurs de bibliographie** — corrige les références de clés BibTeX
- **Erreurs Typst** — corrige les appels de fonctions et la syntaxe

## Comment l'utiliser

Après un échec de compilation, vous pouvez soit :

1. **Demander dans le chat** : *« Corrige l'erreur de compilation »*
2. **Cliquer sur l'erreur** dans les journaux de compilation — l'IA proposera automatiquement de la corriger`,
    },

    'ai-assistant/typst-library': {
      title: 'Bibliothèque Typst',
      description: 'Documentation Typst intégrée accessible via l\'assistant IA.',
      content: `## Qu'est-ce que c'est ?

L'assistant IA a accès à une collection intégrée de **fragments de documentation Typst** couvrant les fonctions, la syntaxe et les motifs courants.

## Comment l'utiliser

Posez simplement une question à l'IA sur n'importe quelle fonctionnalité de Typst :

- *« Comment créer un tableau en Typst ? »*
- *« Quelle est la syntaxe pour une figure avec légende ? »*
- *« Montre-moi comment utiliser la fonction \`grid\` »*

L'IA consultera sa bibliothèque de documentation Typst et fournira des exemples précis et à jour.

## Outils disponibles

| Outil | Description |
|------|-------------|
| \`list_typst_skill_docs\` | Lister tous les sujets de documentation Typst disponibles |
| \`search_typst_skill_docs\` | Rechercher des fonctions ou concepts Typst spécifiques |
| \`read_typst_skill_doc\` | Lire la documentation complète d'un sujet spécifique |`,
    },

    'collaboration': {
      title: 'Présentation de la collaboration',
      description: 'Travaillez ensemble en temps réel avec votre équipe.',
      content: `Le système de collaboration de Clarity est construit sur **Liveblocks** et **Yjs** — la même technologie qui propulse des outils comme Figma et Notion.

## Fonctionnalités

- **Édition en temps réel** — voyez les modifications au fur et à mesure, sans conflit
- **Curseurs en direct** — voyez où vos collaborateurs sont en train de taper
- **Détection de présence** — sachez qui est en ligne et quel fichier ils consultent
- **Commentaires et fils de discussion** — discutez des modifications en ligne
- **Permissions basées sur les rôles** — contrôlez qui peut consulter, commenter ou modifier

## Fonctionnement

Chaque projet dispose d'une **salle de collaboration** dédiée. Lorsque vous ouvrez un projet :

1. Vous vous connectez automatiquement à la salle
2. L'état de votre document se synchronise via les **CRDTs** (Conflict-free Replicated Data Types)
3. Chaque frappe est diffusée à tous les utilisateurs connectés
4. Les modifications se fusionnent automatiquement — aucune résolution manuelle de conflits nécessaire`,
    },

    'collaboration/real-time': {
      title: 'Édition en temps réel',
      description: 'Édition en direct sans conflit avec présence des curseurs.',
      content: `## Curseurs en direct

Lorsque plusieurs personnes modifient le même fichier, le curseur de chaque personne apparaît avec une **couleur unique** et son nom. Vous pouvez voir exactement où chacun est en train de taper.

## Édition sans conflit

> **Info:** Contrairement à Google Docs, Clarity utilise les CRDTs (Conflict-free Replicated Data Types), ce qui signifie que les modifications n'entrent jamais en conflit — même lorsque deux personnes modifient la même ligne simultanément.

Clarity utilise **Yjs** (une bibliothèque CRDT) pour fusionner les modifications de plusieurs utilisateurs. Cela signifie :

- Deux personnes peuvent modifier la même ligne simultanément
- Les modifications sont fusionnées automatiquement et de manière déterministe
- Aucune boîte de dialogue de « conflit » ni étape de fusion
- Fonctionne même sur des connexions lentes ou intermittentes

## Présence

La barre de collaboration affiche :

- **Utilisateurs en ligne** — les avatars de toutes les personnes actuellement dans le projet
- **Fichier actif** — quel fichier chaque personne consulte
- **État inactif** — les utilisateurs qui n'ont pas interagi récemment sont affichés comme inactifs

## Support hors ligne

Si vous perdez temporairement votre connexion :

- Vos modifications locales sont préservées
- À la reconnexion, les modifications se synchronisent automatiquement
- Aucune donnée n'est perdue`,
    },

    'collaboration/sharing': {
      title: 'Partage et permissions',
      description: 'Partagez vos projets avec un contrôle d\'accès précis.',
      content: `## Liens de partage

> **Tip:** Les liens de partage sont le moyen le plus rapide d'inviter des collaborateurs. Aucune création de compte n'est requise pour les lecteurs.

Cliquez sur le bouton **Share** dans la barre d'outils de l'éditeur pour générer un lien de partage. Chaque lien est :

- **Signé** avec HMAC pour la sécurité
- **Avec expiration** — les liens ont une durée de vie configurable
- **Limité par rôle** — chaque lien accorde un niveau de permission spécifique

## Niveaux de permissions

| Rôle | Peut consulter | Peut commenter | Peut modifier |
|------|----------|-------------|----------|
| **Viewer** | Oui | Non | Non |
| **Commenter** | Oui | Oui | Non |
| **Editor** | Oui | Oui | Oui |

## Gérer les accès

Depuis la boîte de dialogue de partage, vous pouvez :

- Générer de nouveaux liens avec différents niveaux de permissions
- Voir qui a actuellement accès
- Révoquer l'accès en invalidant les liens de partage`,
    },

    'collaboration/comments': {
      title: 'Commentaires et fils de discussion',
      description: 'Discutez des modifications avec des commentaires en ligne.',
      content: `## Ajouter des commentaires

Sélectionnez une plage de texte dans l'éditeur et cliquez sur l'icône **commentaire** (ou utilisez le menu contextuel) pour démarrer un nouveau fil de discussion.

## Fonctionnalités des fils de discussion

- **Ancrés au code** — les commentaires sont liés à des plages spécifiques dans votre code source
- **Réponses en fil** — les membres de l'équipe peuvent répondre dans une conversation
- **Synchronisation en temps réel** — les commentaires se mettent à jour instantanément pour tous les collaborateurs
- **Résolution des fils** — marquez les discussions comme résolues lorsqu'elles sont terminées

## Cas d'utilisation

- **Revue de code** — discutez de constructions LaTeX/Typst spécifiques
- **Retours** — les professeurs peuvent laisser des commentaires en ligne sur le travail des étudiants
- **Coordination** — convenez des modifications avant de les implémenter`,
    },

    'projects': {
      title: 'Présentation des projets',
      description: 'Gérez vos documents et votre espace de travail.',
      content: `## Qu'est-ce qu'un projet ?

Un projet est un espace de travail autonome pour un document. Il comprend :

- Tous les fichiers source (\`.tex\`, \`.typ\`, \`.bib\`, images, etc.)
- Les paramètres de compilation
- L'état de collaboration
- L'historique de chat IA

## Types de projets

- **Projets LaTeX** — le fichier d'entrée principal est \`main.tex\`
- **Projets Typst** — le fichier d'entrée principal est \`main.typ\``,
    },

    'projects/dashboard': {
      title: 'Tableau de bord',
      description: 'Votre hub central pour la gestion des projets.',
      content: `## Vues

Basculez entre les vues **grille** et **liste** à l'aide du bouton en haut à droite. Votre préférence est sauvegardée entre les sessions.

## Sections

| Section | Description |
|---------|-------------|
| **Projects** | Tous vos projets |
| **Shared** | Les projets que d'autres ont partagés avec vous |
| **Trash** | Les projets supprimés (récupérables) |

## Actions

- **New Project** — créer un projet vierge ou partir d'un modèle
- **Search** — filtrer les projets par nom
- **Sort** — trier par date de modification ou par nom
- **Delete** — déplacer un projet vers la corbeille (récupérable)
- **Restore** — récupérer un projet depuis la corbeille`,
    },

    'projects/templates': {
      title: 'Modèles',
      description: 'Partez de modèles pré-construits pour les types de documents courants.',
      content: `## Modèles disponibles

Clarity propose des modèles pour les types de documents académiques et scientifiques courants :

- **Article de recherche** — format standard d'article de revue
- **Thèse** — structure de thèse multi-chapitres
- **Présentation** — diapositives Beamer (LaTeX) ou diapositives Typst
- **Lettre** — modèle de lettre formelle
- **Devoir** — format d'exercices

## Utiliser les modèles

1. Cliquez sur **New Project** depuis le tableau de bord
2. Parcourez la galerie de modèles
3. Cliquez sur un modèle pour le prévisualiser
4. Cliquez sur **Use Template** pour créer un nouveau projet pré-rempli avec les fichiers du modèle

## Modèles personnalisés

Vous pouvez créer vos propres modèles en :

1. Configurant un projet avec la structure de votre choix
2. L'utilisant comme point de départ pour vos futurs projets`,
    },

    'mcp': {
      title: 'Intégration MCP',
      description: 'Connectez vos assistants IA directement à votre espace de travail Clarity grâce au Model Context Protocol.',
      content: `Le **Model Context Protocol (MCP)** est un standard ouvert qui permet aux assistants IA — comme Claude Desktop, Cursor et Windsurf — d'interagir avec des outils et services externes. Le serveur MCP de Clarity transforme votre espace de travail en un environnement accessible en direct par l'IA.

## Que peut faire MCP ?

Avec MCP activé, votre assistant IA peut :

- **Lister** tous vos projets Clarity et parcourir les arborescences de fichiers
- **Lire** et **écrire** n'importe quel fichier dans un projet
- **Créer** de nouveaux fichiers (LaTeX, Typst, BibTeX, et plus)
- **Supprimer** des fichiers en toute sécurité (avec protection des fichiers principaux)
- **Compiler** des documents LaTeX et Typst et **déboguer** les erreurs automatiquement
- **Rechercher dans la documentation Typst** — consulter la syntaxe, les fonctions et les motifs
- **Générer des illustrations TikZ** — créer des diagrammes et figures professionnels

Le tout sans quitter votre client IA. Pas de copier-coller, pas de changement de contexte.

## Fonctionnement

Clarity expose un **serveur MCP** avec **11 outils** qui s'exécute localement sur votre machine et communique avec les clients IA via le transport standard \`stdio\` :

1. Vous générez une **clé API** dans les paramètres de Clarity
2. Vous ajoutez Clarity en tant que serveur MCP dans la configuration de votre client IA
3. Le client IA lance le serveur MCP de Clarity en tant que sous-processus
4. Le serveur s'authentifie avec votre clé API et transmet les requêtes au backend de Clarity
5. Votre assistant IA a désormais un accès complet à votre espace de travail

> **Info:** Le serveur MCP est un processus Node.js léger — il ne consomme aucune ressource lorsqu'il est inactif et démarre en moins d'une seconde.

## Architecture

![Architecture MCP — le client IA se connecte via stdio au serveur MCP local, qui se connecte via HTTPS à l'API Clarity](/docs/mcp-architecture.svg)

Votre clé API authentifie chaque requête. Le serveur ne stocke jamais votre clé — il la lit depuis l'environnement au démarrage.

## Liens rapides

- **Guide d'installation** — instructions étape par étape pour Claude Desktop et Cursor
- **Référence des outils** — documentation détaillée pour les 11 outils MCP
- **Clés API et sécurité** — fonctionnement des clés, bonnes pratiques et modèle de menaces`,
    },

    'mcp/setup': {
      title: 'Guide d\'installation',
      description: 'Configurez Clarity MCP dans Claude Desktop, Cursor ou tout client compatible MCP en moins de 2 minutes.',
      content: `## Prérequis

- Un compte Clarity avec au moins un projet
- Un client IA compatible MCP (Claude Desktop, Cursor, Windsurf, etc.)

> **Info:** L'assistant de configuration ci-dessous générera un extrait de configuration prêt à coller pour votre client. Il vous suffit de coller votre clé API et de copier la configuration.

{{mcp-setup-wizard}}

---

## Dépannage

| Problème | Solution |
|---------|----------|
| "CLARITY_API_KEY is required" | Assurez-vous que le bloc \`env\` contient votre clé |
| "API 401: Invalid API key" | Régénérez la clé dans Settings → MCP / API |
| Les outils n'apparaissent pas | Redémarrez votre client IA après avoir modifié la configuration |

> **Tip:** Vous pouvez tester la connexion en demandant à votre IA : *« Liste mes projets Clarity. »* Si elle renvoie votre espace de travail, tout fonctionne.`,
    },

    'mcp/tools': {
      title: 'Référence des outils',
      description: 'Référence complète des 11 outils MCP exposés par le serveur Clarity.',
      content: `Le serveur MCP de Clarity expose **11 outils** organisés en quatre catégories. Voici chaque outil, ses paramètres et quand l'utiliser.

---

## Outils de projets et fichiers

### list_projects

**Lister tous les projets de votre espace de travail Clarity.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| *(aucun)* | — | — | Aucun paramètre |

---

### list_files

**Lister tous les fichiers d'un projet.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Oui | L'identifiant du projet |

---

### read_file

**Lire le contenu complet d'un fichier.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Oui | L'identifiant du fichier à lire |

---

### write_file

**Mettre à jour le contenu d'un fichier existant.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Oui | L'identifiant du fichier à mettre à jour |
| \`content\` | string | Oui | Le nouveau contenu du fichier |

> **Warning:** Cela écrase l'intégralité du fichier. Lisez toujours le fichier d'abord, puis envoyez le contenu mis à jour complet.

---

### create_file

**Créer un nouveau fichier dans un projet.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Oui | Le projet |
| \`name\` | string | Oui | Nom du fichier avec extension |
| \`content\` | string | Non | Contenu initial |
| \`parent_id\` | string | Non | Identifiant du dossier parent |

---

### delete_file

**Supprimer un fichier d'un projet.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`file_id\` | string | Oui | L'identifiant du fichier à supprimer |

> **Warning:** La suppression est permanente. Utilisez avec précaution.

---

## Compilation et débogage

### compile

**Compiler un projet et renvoyer le résultat.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Oui | L'identifiant du projet |

---

### debug_compile

**Compiler et renvoyer une analyse structurée des erreurs.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Oui | L'identifiant du projet |

---

## Documentation Typst

### typst_docs_search

**Rechercher dans la bibliothèque de documentation Typst intégrée.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`query\` | string | Oui | Requête de recherche |

> **Tip:** Utilisez cet outil AVANT d'écrire du code Typst.

---

### typst_docs_read

**Lire un fichier de documentation Typst spécifique.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`path\` | string | Oui | Le \`relativePath\` issu d'un résultat de recherche |

---

## Illustration TikZ

### tikz_illustrate

**Générer des illustrations TikZ professionnelles.**

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| \`project_id\` | string | Oui | L'identifiant du projet |
| \`description\` | string | Oui | Ce qu'il faut illustrer |
| \`file_name\` | string | Non | Nom du fichier pour la figure |

**Capacités :**
- Organigrammes et diagrammes de processus
- Architectures de réseaux de neurones
- Tracés mathématiques (via pgfplots)
- Diagrammes commutatifs (via tikz-cd)
- Diagrammes de Feynman (via tikz-feynman)
- Structures arborescentes et hiérarchies

---

## Flux de travail typiques

### Modifier et compiler

1. \`list_projects\` → trouver le projet
2. \`list_files\` → explorer la structure
3. \`read_file\` → lire le fichier cible
4. \`write_file\` → appliquer les modifications
5. \`compile\` → vérifier la compilation

### Déboguer une compilation échouée

1. \`debug_compile\` → obtenir une analyse structurée des erreurs
2. \`read_file\` → lire le fichier contenant les erreurs
3. \`write_file\` → corriger les problèmes
4. \`compile\` → confirmer la correction

> **Tip:** Vous pouvez faire tout cela en une seule requête : *« Crée un nouveau fichier de chapitre appelé methodology.tex, ajoute un organigramme TikZ, inclus-le dans main.tex et compile. »*`,
    },

    'mcp/security': {
      title: 'Clés API et sécurité',
      description: 'Comment Clarity protège vos projets et vos données lors de l\'utilisation de MCP.',
      content: `## Fonctionnement des clés API

Lorsque vous créez une clé API dans **Settings → MCP / API**, Clarity :

1. Génère **32 octets aléatoires cryptographiquement sûrs** à l'aide de Node.js \`crypto.randomBytes\`
2. Les encode en une chaîne base64url avec le préfixe \`sk_clarity_\`
3. Calcule un **hachage SHA-256** de la clé complète
4. Stocke **uniquement le hachage** dans la base de données
5. Vous renvoie la clé en clair **une seule et unique fois**

## Flux d'authentification

Chaque requête API MCP suit ce chemin :

1. Votre client IA envoie la clé en clair dans l'en-tête \`Authorization: Bearer\`
2. L'API Clarity hache la clé entrante avec SHA-256
3. Elle compare le hachage en utilisant une **comparaison à temps constant** (\`crypto.timingSafeEqual\`)
4. En cas de correspondance, elle extrait le \`user_id\` associé et poursuit le traitement

> **Info:** La comparaison à temps constant empêche les attaquants d'obtenir des informations sur votre clé en mesurant les temps de réponse.

## Vérification de propriété

| Point d'accès | Vérification de propriété |
|----------|-----------------|
| Lister les projets | Filtre les projets où le \`user_id\` correspond |
| Lister / créer des fichiers | Vérifie que le projet appartient à l'utilisateur |
| Lire / écrire / supprimer un fichier | Vérifie que le fichier appartient à l'utilisateur |
| Compiler / déboguer | Vérifie que le projet appartient à l'utilisateur |

## Bonnes pratiques de gestion des clés

- **Utilisez des libellés descriptifs** — nommez les clés d'après le client
- **Une clé par client** — ne réutilisez pas les clés entre les machines
- **Effectuez une rotation périodique** — générez une nouvelle clé tous les quelques mois
- **Ne committez jamais les clés** — ajoutez votre configuration MCP au \`.gitignore\`

## Limites des clés

| Fonctionnalité | Limite |
|---------|-------|
| Clés par utilisateur | 5 |
| Longueur de la clé | 48 caractères |
| Révocation | Immédiate |

## Ce que MCP peut et ne peut pas faire

**MCP peut :**

- Lister tous vos projets et parcourir les arborescences de fichiers
- Lire, écrire, créer et supprimer des fichiers
- Compiler des documents LaTeX et Typst
- Déboguer les erreurs de compilation
- Rechercher dans la documentation Typst
- Générer des illustrations TikZ

**MCP ne peut pas :**

- Créer ou supprimer des projets entiers
- Supprimer le fichier d'entrée principal
- Supprimer des dossiers non vides
- Téléverser des fichiers binaires
- Accéder aux données d'autres utilisateurs
- Modifier les paramètres du compte
- Accéder aux informations de facturation
- Contourner la vérification de propriété

## Piste d'audit

Chaque fois que votre clé API est utilisée, Clarity met à jour l'horodatage **Dernière utilisation** visible dans Settings → MCP / API.`,
    },

    'settings': {
      title: 'Paramètres',
      description: 'Configurez Clarity selon votre flux de travail.',
      content: `Accédez aux paramètres depuis l'**icône d'engrenage** dans la barre latérale du tableau de bord.

## Paramètres de l'éditeur

| Paramètre | Description |
|---------|-------------|
| **Thème** | Choisissez parmi les thèmes d'éditeur disponibles |
| **Taille de police** | Ajustez la taille de police de l'éditeur |
| **Famille de police** | Sélectionnez votre police de code préférée |
| **Sauvegarde automatique** | Configurez l'intervalle de sauvegarde automatique |

## Paramètres de l'assistant

| Paramètre | Description |
|---------|-------------|
| **Modèle IA** | Choisissez le modèle IA à utiliser |
| **Clé API** | Configurez des clés API personnalisées |
| **Prompt système** | Personnalisez le comportement de l'IA |

## Paramètres du tableau de bord

| Paramètre | Description |
|---------|-------------|
| **Vue par défaut** | Vue en grille ou en liste pour les projets |
| **Tri par défaut** | Ordre de tri pour la liste des projets |

## Paramètres de l'espace de travail

- Configuration de l'équipe et de l'espace de travail
- Gestion des membres
- Configuration des permissions

## Paramètres de sécurité

- Contrôles de confidentialité des données
- Préférences de sécurité`,
    },

    'billing': {
      title: 'Facturation et forfaits',
      description: 'Des forfaits gratuits et payants pour chaque étape de votre recherche.',
      content: `## Forfaits

### Free — 0 $/mois

Idéal pour commencer :

- Éditeur complet avec support LaTeX et Typst
- Aperçu PDF et compilation dans le cloud
- Un projet
- Assistant IA (utilisation limitée)

### Supporter — 9 $/mois

Pour la recherche sérieuse :

- **Projets illimités**
- **Contrôles d'équipe** et collaboration
- **Compilations plus rapides** avec priorité
- Accès complet à l'assistant IA

## Gérer votre abonnement

1. Rendez-vous dans **Settings → Billing**
2. Cliquez sur **Upgrade** pour souscrire au forfait Supporter
3. Vous serez redirigé vers une page de paiement sécurisée Stripe
4. Après le paiement, votre forfait est activé immédiatement

## Annulation

Vous pouvez annuler votre abonnement à tout moment depuis la page des paramètres de facturation. Vous conserverez l'accès aux fonctionnalités payantes jusqu'à la fin de votre période de facturation en cours.`,
    },

    'faq': {
      title: 'Foire aux questions',
      description: 'Questions fréquentes sur Clarity.',
      content: `## Général

**Qu'est-ce que Clarity ?**
Clarity est un éditeur scientifique collaboratif propulsé par l'IA qui prend en charge LaTeX et Typst. Considérez-le comme une alternative moderne et augmentée par l'IA à Overleaf.

**Clarity est-il gratuit ?**
Oui ! Le forfait gratuit comprend l'éditeur complet, la compilation dans le cloud et un projet. Passez au forfait Supporter (9 $/mois) pour des projets illimités et des compilations plus rapides.

**Dois-je installer quelque chose ?**
Non. Clarity fonctionne entièrement dans le navigateur.

## Éditeur

**Quelle distribution LaTeX Clarity utilise-t-il ?**
Clarity utilise une installation complète de texlive exécutée dans des conteneurs Docker.

**Puis-je téléverser mes propres fichiers .sty ou .cls ?**
Oui.

**Clarity prend-il en charge BibTeX ?**
Oui. Ajoutez un fichier \`.bib\` à votre projet et référencez-le avec \`\\bibliography{}\` ou \`\\addbibresource{}\`.

## Collaboration

**Combien de personnes peuvent collaborer sur un projet ?**
Il n'y a pas de limite stricte.

**Mes données sont-elles sécurisées ?**
Oui. Les liens de partage utilisent des jetons HMAC signés avec expiration. La collaboration utilise des connexions WebSocket authentifiées. Toutes les données sont chiffrées en transit.

**Puis-je travailler hors ligne ?**
L'éditeur nécessite une connexion internet pour la compilation et la synchronisation collaborative. Cependant, vos modifications locales sont préservées et se synchroniseront automatiquement à la reconnexion.

## Assistant IA

**Quels modèles IA Clarity prend-il en charge ?**
Clarity prend en charge les modèles d'Anthropic (Claude), OpenAI (GPT) et Google (Gemini).

**L'IA peut-elle accéder à mes fichiers ?**
Uniquement dans le projet actuel, et seulement lorsque vous interagissez avec elle.

**L'IA modifiera-t-elle mes fichiers sans ma permission ?**
Non. Chaque modification de l'IA passe par un flux d'approbation par étapes. Vous voyez un aperçu des différences et devez approuver avant que toute modification ne soit appliquée.`,
    },
  },

  ui: {
    search: 'Rechercher...',
    onThisPage: 'Sur cette page',
    previous: 'Précédent',
    next: 'Suivant',
    wasThisHelpful: 'Cet article vous a-t-il été utile ?',
    thanksFeedback: 'Merci pour votre retour !',
    willImprove: 'Nous allons travailler à améliorer cela.',
    results: 'Résultats',
    noResults: 'Aucun résultat trouvé.',
    features: 'Fonctionnalités',
    more: 'Plus',
    docs: 'Documentation',
    blog: 'Blog',
    home: 'Accueil',
  },
}

export default fr
