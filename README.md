[README-MindSynth.md](https://github.com/user-attachments/files/32296715/README-MindSynth.md)
# 🧠 MindSynth --- Text Summarizer & Mind Map Generator

MindSynth is a browser-based text processing and visualization
application that converts long-form text into concise, ranked summary
points and an interactive mind map. It combines deterministic text
analysis with D3.js-based visualization to help users review information
in a structured visual form.

> **Implementation note:** MindSynth does not use an external AI/LLM
> service. The summarization and keyword extraction pipeline is
> implemented in JavaScript using sentence filtering, word-frequency
> analysis, sentence scoring, and keyword density.

## ✨ Features

-   **Text summarization** with configurable summary length.
-   **Basic and advanced analysis modes** for sentence scoring.
-   **Keyword extraction** using normalized word-frequency analysis.
-   **Automatic heading generation** for summary and mind-map nodes.
-   **Interactive D3.js mind maps** generated from summary sentences and
    keywords.
-   **Hierarchical visualization** with root, main-topic, and keyword
    nodes.
-   **Zoom controls** with zoom in, zoom out, and reset.
-   **Fullscreen mind-map view** using the browser Fullscreen API.
-   **Node interaction** with tooltips and detailed sentence
    information.
-   **Summary statistics** including word count, estimated reading time,
    and summary-point count.
-   **Copy summary** directly to the clipboard.
-   **Export summary** as a text file.
-   **Mind-map export** as PNG or SVG.
-   **PDF export fallback** currently exports the mind map as PNG
    because a PDF library is not included.
-   **Native Web Share API support** with fallback sharing options.
-   **Light and dark themes** with theme persistence.
-   **Sign-in/sign-up interface** with client-side simulated
    authentication.
-   **Local state persistence** using `localStorage`.
-   **Sample text loading**, clipboard paste, clear input, and
    character-count feedback.
-   **Responsive interface** for desktop, tablet, and mobile layouts.
-   **Toast notifications and centralized error handling** for user
    feedback.

## 🛠️ Technology Stack

  -----------------------------------------------------------------------
  Technology                          Purpose
  ----------------------------------- -----------------------------------
  HTML5                               Application structure and semantic
                                      UI

  CSS3                                Responsive styling, themes, layout,
                                      and animations

  JavaScript (ES6+)                   Application logic and
                                      text-processing pipeline

  D3.js 7.8.5                         Interactive hierarchical mind-map
                                      visualization

  Font Awesome 6.4.0                  Interface icons

  Browser APIs                        Clipboard, Local Storage,
                                      Fullscreen, Web Share, Blob/File
                                      downloads
  -----------------------------------------------------------------------

The external libraries are loaded through CDN references in
`index.html`. fileciteturn7file2L148-L156

## 🧩 Application Architecture

``` text
                    ┌──────────────────────┐
                    │       MindSynth      │
                    │   Browser Web App    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Text Input        App State        UI Controls
              │                │                │
              ▼                ▼                │
       TextProcessor       localStorage        │
              │                                 │
       ┌──────┴────────┐                        │
       │               │                        │
       ▼               ▼                        │
 Sentence Scoring   Keywords                    │
       │               │                        │
       └──────┬────────┘                        │
              ▼                                 │
        Summary Data                             │
              │                                 │
              ▼                                 │
       MindMapGenerator                         │
              │                                 │
              ▼                                 │
          D3.js SVG                              │
              │                                 │
       ┌──────┼───────────────┐                 │
       ▼      ▼               ▼                 │
     Zoom   Fullscreen      Export/Share ◄──────┘
```

The JavaScript implementation separates application state, utility
functions, notifications, text processing, mind-map generation, and the
main application controller. fileciteturn7file3L214-L241

## 🔄 How It Works

### 1. Enter text

Users can type or paste content into the main text area. The interface
also provides a sample-text option and a character counter. The
application validates the input against configured minimum and maximum
lengths.

The current implementation accepts text from **100 to 50,000
characters**. fileciteturn7file3L226-L240

### 2. Configure analysis

Users can select:

-   Brief --- 3 summary points
-   Standard --- 5 summary points
-   Detailed --- 8 summary points
-   Basic analysis
-   Advanced analysis

The selected options are passed to the text-processing engine when
summarization is requested. fileciteturn7file3L226-L240

### 3. Process the text

`TextProcessor` performs deterministic text analysis:

1.  Splits text into candidate sentences.
2.  Filters sentences by length and terminal punctuation.
3.  Calculates word frequencies after removing configured stop words.
4.  Scores sentences using multiple signals.
5.  Applies additional keyword-density scoring in advanced mode.
6.  Selects the requested number of highest-scoring sentences.
7.  Extracts keywords from normalized word frequencies.
8.  Calculates word count and estimated reading time.

The resulting summary object contains selected sentences, keywords, word
count, and reading time. fileciteturn6file7L857-L894

### 4. Generate the mind map

The mind-map generator converts the summary into a hierarchy:

``` text
Root Topic
│
├── Summary Sentence 1
│   ├── Keyword
│   ├── Keyword
│   └── Keyword
│
├── Summary Sentence 2
│   ├── Keyword
│   └── Keyword
│
└── Summary Sentence N
    ├── Keyword
    └── Keyword
```

The root topic is generated from the summary, each summary sentence
becomes a main branch, and keywords become child nodes.
fileciteturn5file2L432-L465

### 5. Visualize with D3.js

MindSynth uses D3's hierarchy and tree-layout functionality to render
the generated structure as an SVG mind map. Nodes and links are rendered
separately, with different visual treatments for root, main, and keyword
nodes. fileciteturn5file2L503-L545

## 🧠 Text Processing Method

MindSynth uses an extractive, rule-based summarization approach rather
than generative AI.

### Sentence extraction

Candidate sentences are created using punctuation-based splitting and
filtered to retain sentences between configured length boundaries.
fileciteturn6file7L887-L894

### Sentence scoring

Each candidate sentence receives a score based on:

-   **Position score** --- earlier sentences receive a small positional
    boost.
-   **Length score** --- sentences near an ideal length receive higher
    scores.
-   **Word-frequency score** --- frequently occurring non-stop words
    contribute to sentence importance.
-   **Keyword-density score** --- enabled for advanced analysis.

The highest-scoring sentences are selected and then restored to their
original document order. fileciteturn6file7L896-L899

### Keyword extraction

Keywords are derived from normalized word frequencies and sorted by
frequency before selecting the configured maximum number of keywords.

This makes the pipeline deterministic and explainable: the same input
and configuration produce the same processing logic without requiring a
model API.

## 🗺️ Mind Map Interaction

The generated visualization supports:

-   Clickable nodes.
-   Sentence tooltips.
-   Zoom in.
-   Zoom out.
-   Reset zoom.
-   Fullscreen mode.
-   Responsive SVG rendering.
-   Export to image/vector formats.

The application uses D3 zoom behavior with a defined scale range and
applies transformations to the main SVG group.
fileciteturn5file2L492-L500

Fullscreen behavior is implemented through browser fullscreen APIs with
compatibility fallbacks. fileciteturn6file0L67-L118

## 💾 State Management

`AppState` maintains:

-   Current user
-   Current theme
-   Current summary data
-   Current mind-map instance
-   Processing state

User and theme information can be persisted through `localStorage`.
fileciteturn6file2L250-L304

### Authentication limitation

The sign-in/sign-up interface is currently a **client-side simulation**.
Form validation is performed in JavaScript, and the simulated
authentication flow creates a local user object rather than
communicating with a real authentication server.
fileciteturn6file6L770-L795

Therefore, the authentication system should not be treated as
production-grade account security.

## 📤 Export and Sharing

### Summary export

A generated summary can be copied to the clipboard or exported as a text
file containing:

-   Word count
-   Estimated reading time
-   Summary points
-   Summary sentences
-   Key terms

fileciteturn5file0L17-L36

### Mind-map export

The application supports:

-   **PNG** --- rendered through a canvas.
-   **SVG** --- serialized as a standalone SVG with embedded styling.
-   **PDF option** --- currently falls back to PNG because a dedicated
    PDF library is not included.

fileciteturn5file4L360-L393

### Sharing

Where supported, MindSynth uses the browser Web Share API. Otherwise, it
provides fallback actions such as copying the page URL, opening an email
draft, or sharing through supported social platforms.
fileciteturn6file1L160-L188

## 🎨 UI and Responsive Design

The interface includes:

-   Light/dark theme support.
-   Input, Summary, and Mind Map tabs.
-   Responsive controls.
-   Mobile-friendly layouts.
-   Toast notifications.
-   Loading indicators.
-   Modal dialogs.
-   Accessible labels for major controls.

The CSS defines theme variables, reusable spacing and typography tokens,
responsive breakpoints, and dedicated styles for the input, summary,
mind-map, and authentication sections. fileciteturn4file1L3-L49

On smaller screens, processing controls become full-width and the
navigation tabs adapt to the available space.
fileciteturn4file1L139-L199

## 📁 Project Structure

``` text
MindSynth/
│
├── index.html
├── style.css
├── backend.js
└── README.md
```

### `index.html`

Defines the application interface, including:

-   Navigation
-   Theme control
-   Authentication modal
-   Text input
-   Summary section
-   Mind-map section
-   Export/share controls
-   Responsive tabs

fileciteturn5file1L92-L148

### `style.css`

Contains the visual system, responsive layouts, dark-mode variables,
buttons, forms, summary styling, mind-map styling, and mobile
breakpoints. fileciteturn4file1L52-L80

### `backend.js`

Despite its filename, `backend.js` contains the **client-side
application logic**. It defines the application state manager, text
processor, mind-map generator, utilities, toast system, and main
application controller. fileciteturn7file3L214-L241

> There is no server-side backend shown in the supplied project files.

## 🚀 Getting Started

### Prerequisites

A modern browser with support for standard Web APIs is recommended.

### Run locally

Because the application is composed of static frontend files, it can be
opened through a local static server.

For example, with Python:

``` bash
python -m http.server 8000
```

Then open:

``` text
http://localhost:8000
```

Alternatively, use a VS Code Live Server extension or another
static-file server.

### Important

The project loads D3.js and Font Awesome from external CDNs, so those
dependencies require network access when the page loads.
fileciteturn7file2L148-L156

## ⚙️ Configuration

Core application configuration is defined near the top of `backend.js`.

``` javascript
const CONFIG = {
  MAX_TEXT_LENGTH: 50000,
  MIN_TEXT_LENGTH: 100,
  DEFAULT_SUMMARY_POINTS: 5,
  MAX_SUMMARY_POINTS: 10,
  MINDMAP_DIMENSIONS: {
    width: 1200,
    height: 800,
    padding: 60
  },
  EXPORT_OPTIONS: {
    formats: ['png', 'svg', 'pdf'],
    quality: 1.0,
    background: '#ffffff'
  }
};
```

fileciteturn7file3L223-L241

## 🧪 Error Handling

MindSynth includes:

-   Input validation.
-   Processing-state protection against overlapping operations.
-   Clipboard error handling.
-   Storage error handling.
-   Network/fetch error handling.
-   Global JavaScript error handling.
-   Unhandled promise rejection handling.
-   Online/offline notifications.
-   Toast-based user feedback.

The application maps common technical errors to user-oriented messages
instead of exposing raw error details directly in the interface.
fileciteturn6file3L442-L464

## 🔐 Security and Privacy Considerations

MindSynth is primarily a client-side application. However, its current
authentication implementation should not be considered secure account
management because credentials are not verified against a backend
authentication service.

For production deployment, consider adding:

-   Server-side authentication.
-   Password hashing.
-   Session/token management.
-   Secure account storage.
-   HTTPS.
-   Content Security Policy.
-   Server-side validation.
-   Secure sharing/storage mechanisms.

The current project should therefore be presented as a frontend-focused
prototype/application rather than a production authentication platform.

## ⚠️ Current Limitations

1.  **Rule-based summarization** --- no LLM or transformer-based
    semantic understanding.
2.  **English-oriented processing** --- the built-in stop-word list and
    sentence heuristics are designed around English text.
3.  **Client-side authentication** --- sign-in/sign-up is simulated.
4.  **No persistent server database** is shown in the supplied source.
5.  **PDF export** currently falls back to PNG.
6.  **External CDN dependencies** require network access.
7.  **Sentence splitting is heuristic** and may not correctly handle
    every punctuation or abbreviation pattern.
8.  **Keyword extraction is frequency-based**, so frequent terms are not
    necessarily the most semantically important terms.
9.  **Share actions depend on browser capabilities and external platform
    behavior.**

## 🔮 Future Improvements

Potential extensions include:

-   Replace heuristic summarization with an NLP or transformer-based
    summarization model.
-   Add semantic embeddings for improved keyword and topic extraction.
-   Support multilingual summarization.
-   Add a real backend authentication system.
-   Persist summaries and mind maps in a database.
-   Add user workspaces and document history.
-   Add drag-and-drop mind-map editing.
-   Add node creation, deletion, and rearrangement.
-   Add true PDF generation with a dedicated PDF library.
-   Add automated unit and integration tests.
-   Add offline dependency bundling instead of CDN-only libraries.
-   Add accessibility testing and keyboard-first mind-map navigation.

## 📌 Technical Highlights

From an engineering perspective, the project demonstrates:

-   Object-oriented JavaScript organization using dedicated classes.
-   Deterministic text-processing algorithms.
-   Configurable processing parameters.
-   D3.js hierarchical data visualization.
-   SVG manipulation and serialization.
-   Browser API integration.
-   Local state persistence.
-   Responsive CSS architecture.
-   Debouncing and throttling utilities.
-   Centralized toast notifications.
-   Error handling across synchronous and asynchronous operations.
-   Export and sharing workflows.

## 👨‍💻 Project Positioning

**MindSynth** can be presented as a frontend-focused text-analysis and
knowledge-visualization project demonstrating practical JavaScript
engineering, algorithmic text processing, browser API integration, and
interactive data visualization.

It is particularly relevant for demonstrating:

-   JavaScript fundamentals and ES6+ class design
-   DOM manipulation
-   Algorithmic thinking
-   Text processing
-   D3.js
-   SVG visualization
-   Responsive UI development
-   Browser APIs
-   Client-side state management

## 📄 License

Add the license that applies to your repository before publishing a
license statement here.

------------------------------------------------------------------------

**MindSynth --- Transform Text into Visual Knowledge.**
