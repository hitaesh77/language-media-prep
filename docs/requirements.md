# Release requirements: V1 and semester scope

Last updated: 2026-10-29.

This document records the agreed release scope supplied in the product brief. Requirements describe the target, not a claim that the feature is implemented. See [the progress log](progress-log.md) for current status and [architecture](architecture.md) for implementation details.

- **V1 deadline:** Friday, October 30, 2026. A polished, working local prototype with real Arabic text/PDF processing, server-side AI vocabulary generation, and flashcard review.
- **V2 / full-scope deadline:** end of semester; exact date still to be recorded. V2 includes all V1 requirements plus the semester additions below.
- **Architecture clarification:** Next.js App Router with TypeScript is the frontend; FastAPI is the backend. The brief's "full-stack Next.js/TypeScript" wording does not replace this established stack.
- **Conditional scope:** automatic movie/subtitle discovery depends on provider feasibility. Investigate during V1; do not treat retrieval as guaranteed.
- **Defaults:** proficiency, variety, and explanation defaults remain provisional until reviewed. Grounding confirms occurrence, not correctness of a meaning.

## Requirements

Each row retains its release assignment from the supplied brief. V2* denotes conditional scope.

V2: End-of-semester release adding movie/subtitle preparation, improving AI accuracy, and completing stakeholder validation.

### 1. Content Input and Processing

| Requirement | Release |
| --- | --- |
| Paste Arabic text directly into the application | V1 |
| Upload short text-based PDF files | V1 |
| Extract Arabic text from uploaded PDFs | V1 |
| Display extracted text for review | V1 |
| Select specific passages for vocabulary generation | V1 |
| Support proper Arabic right-to-left text rendering | V1 |
| Validate file types, sizes, and input lengths | V1 |
| Handle invalid files, empty text, and extraction failures | V1 |
| Upload SRT subtitle files | V2 |
| Upload VTT subtitle files | V2 |
| Parse subtitles while preserving timestamps | V2 |
| Select movie segments using subtitle timestamps | V2 |
| Search for movies by title | V2 |
| Retrieve Arabic subtitles through an external API | V2* |
| Fall back to subtitle upload when automatic retrieval fails | V2 |

**Conditional V2 scope:** movie search and API retrieval depend on provider feasibility, coverage, and access. Investigate these during V1 development.

### 2. Learner Preferences

| Requirement | Release |
| --- | --- |
| Select proficiency level (Beginner, Intermediate, Advanced) | V1 |
| Select target Arabic variety (MSA or dialect) | V1 |
| Select preferred explanation language | V1 |
| Apply learner preferences to vocabulary generation | V1 |
| Allow users to modify settings and regenerate vocabulary | V1 |
| Refine proficiency and variety options based on stakeholder feedback | V2 |

### 3. AI Vocabulary Generation

| Requirement | Release |
| --- | --- |
| Integrate an LLM through secure server-side API calls | V1 |
| Generate approximately 10-15 vocabulary words or phrases | V1 |
| Prioritize vocabulary according to proficiency level | V1 |
| Identify useful multiword expressions, not just individual words | V1 |
| Provide contextual meanings for each expression | V1 |
| Provide brief explanations in the learner's chosen language | V1 |
| Include the original Arabic expression on each card | V1 |
| Include the source sentence or passage for each expression | V1 |
| Associate generated items with stable source references | V1 |
| Validate that selected expressions occur in the original source | V1 |
| Validate structured LLM responses before displaying results | V1 |
| Prevent duplicate vocabulary entries | V1 |
| Handle AI failures, malformed responses, and timeouts | V1 |
| Display loading states during vocabulary generation | V1 |
| Allow vocabulary regeneration | V1 |
| Improve Arabic meaning accuracy through proficient reviewer feedback | V2 |
| Optimize vocabulary prioritization and relevance | V2 |
| Compare AI-selected vocabulary to a frequency-based baseline | V2 |
| Evaluate consistency across different Arabic varieties | V2 |

### 4. Vocabulary List and Management

| Requirement | Release |
| --- | --- |
| Display generated vocabulary in a readable list | V1 |
| Show each expression's contextual meaning | V1 |
| Show source context for each expression | V1 |
| Mark individual vocabulary items as known or familiar | V1 |
| Unmark previously marked items | V1 |
| Filter known items out of flashcard review | V1 |
| Display the number of remaining unfamiliar words | V1 |
| Allow users to move between vocabulary and review screens | V1 |
| Refine filtering and selection based on usability feedback | V2 |

### 5. Flashcard Review

| Requirement | Release |
| --- | --- |
| Start flashcard review using unfamiliar vocabulary | V1 |
| Display the Arabic word or phrase on the card front | V1 |
| Reveal contextual meaning on the card back | V1 |
| Display source context when reviewing a card | V1 |
| Navigate between cards | V1 |
| Track review progress within the current session | V1 |
| Display a completion screen | V1 |
| Allow users to restart the review | V1 |
| Refine review format based on stakeholder feedback | V2 |

### 6. Frontend and User Experience

| Requirement | Release |
| --- | --- |
| Clean, minimalist, modern user interface | V1 |
| Prepare screen for text and PDF input | V1 |
| Learner settings controls | V1 |
| Vocabulary results screen | V1 |
| Flashcard review screen | V1 |
| Clear navigation between application stages | V1 |
| Responsive desktop and mobile layouts | V1 |
| Consistent typography, spacing, and colors | V1 |
| Correct bidirectional rendering for Arabic and English | V1 |
| Loading indicators and actionable error messages | V1 |
| Empty states for missing content or vocabulary | V1 |
| Movie and subtitle input interface | V2 |
| Timestamp-based segment selection interface | V2 |
| UI improvements from stakeholder usability testing | V2 |

### 7. Backend and Architecture

| Requirement | Release |
| --- | --- |
| Full-stack Next.js/TypeScript application | V1 |
| Server-side API endpoint for vocabulary generation | V1 |
| Server-side PDF extraction | V1 |
| Secure environment variable management | V1 |
| Keep LLM credentials exclusively on the server | V1 |
| Validate and limit uploaded content on the server | V1 |
| Treat source content as untrusted, including in LLM prompts | V1 |
| Generate stable source segment IDs | V1 |
| Store review progress in application state during the session | V1 |
| Separate content parsing, AI processing, validation, and UI logic | V1 |
| Subtitle parsing service | V2 |
| External subtitle API integration, if feasible | V2 |
| Manage subtitle timestamps and movie segment references | V2 |
| Optimize performance and reliability | V2 |

A database, authentication system, and permanent vocabulary storage are not required for either release unless testing identifies a clear need.

### 8. Testing and Validation

| Requirement | Release |
| --- | --- |
| Unit tests for Arabic text processing | V1 |
| Unit tests for PDF extraction | V1 |
| Unit tests for source-reference validation | V1 |
| Tests for malformed AI output | V1 |
| Tests for known-word filtering | V1 |
| End-to-end test of the main preparation workflow | V1 |
| Manual verification of Arabic and English rendering | V1 |
| Basic logging of generation latency and token usage/cost | V1 |
| Unit tests for subtitle parsing and timestamp preservation | V2 |
| Test representative Arabic subtitle files | V2 |
| Review contextual accuracy with an Arabic-proficient reviewer | V2 |
| Conduct stakeholder usability testing | V2 |
| Conduct a small vocabulary-preparation pilot | V2 |
| Compare lookup interruptions with and without preparation | V2 |
| Measure preparation and consumption time | V2 |
| Evaluate comprehension and perceived usefulness | V2 |
| Resolve major usability and reliability problems | V2 |

### 9. Documentation and Deployment

| Requirement | Release |
| --- | --- |
| README with project overview and setup instructions | V1 |
| Product-development AGENTS.md | V1 |
| Appropriate .gitignore | V1 |
| Document architecture and API contracts | V1 |
| Document required environment variables | V1 |
| Document unresolved product decisions | V1 |
| Locally runnable application | V1 |
| Deploy a usable hosted version | V2 |
| Document external subtitle API requirements | V2 |
| Document testing procedures and results | V2 |
| Finalize product documentation and known limitations | V2 |

### 10. Explicitly excluded features

These are not required for either V1 or V2.

- Video or audio upload and transcription
- Netflix integration
- Full-book processing
- Scanned-PDF OCR
- Multi-language support beyond Arabic
- User accounts and authentication
- Persistent vocabulary libraries
- Spaced repetition
- Gamification, streaks, and achievements
- Full language-learning curriculum
- Integrated video playback

YouTube integration remains an open question rather than a planned requirement.

## Release completion criteria

### V1: Working Prototype

A learner can paste Arabic text or upload a PDF, select a passage, set their proficiency and Arabic variety, generate 10-15 grounded vocabulary items, mark familiar expressions, and complete an interactive flashcard review.

All major controls work, the interface is polished, and the entire application runs locally without an account or database.

### V2: Semester Completion

A learner can prepare vocabulary from pasted text, PDF documents, or uploaded movie subtitles. The application supports timestamped movie segments and, if feasible, automated movie subtitle discovery.

The system has improved vocabulary accuracy, meaningful automated test coverage, stakeholder feedback, and documented experimental evaluation.

Recommended scope boundary: V1 should deliver nearly the entire learning experience, including PDF support. V2 should primarily extend the types of media learners can prepare for and provide evidence that the application helps them learn more efficiently.
