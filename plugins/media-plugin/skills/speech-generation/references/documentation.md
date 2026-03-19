# Documentation Reference

Technical docs, tutorials, README narration, API documentation, and educational content.

## Presets

| Use Case | stability | similarity_boost | style | speed | Voice Traits |
|----------|-----------|-------------------|-------|-------|-------------|
| **Technical Tutorial** | 0.55 | 0.80 | 0.10 | 0.90 | Clear, patient, teacher-like. Slightly slow for comprehension. |
| **README Narration** | 0.60 | 0.80 | 0.05 | 0.95 | Neutral, informational, efficient. Get to the point. |
| **API Documentation** | 0.65 | 0.80 | 0.00 | 0.95 | Professional, precise, no frills. Closest to "just reading." |
| **E-Learning Course** | 0.50 | 0.80 | 0.15 | 0.90 | Warm, encouraging, patient. Style adds engagement. |
| **Changelog / Release Notes** | 0.70 | 0.80 | 0.00 | 1.00 | Flat, efficient, factual. High stability for consistency. |

## Text Cleaning Checklist

Technical documents need significant cleanup before speech generation. Run through this checklist:

### 1. Strip Markdown Formatting
| Original | Spoken Version |
|----------|---------------|
| `# Getting Started` | "Getting Started." (or omit if obvious from context) |
| `## Installation` | "Installation." |
| `**important**` | "important" (emphasis comes from voice, not markup) |
| `[link text](url)` | "link text" (drop the URL) |
| `` `variable_name` `` | "variable name" (drop backticks, add spaces) |

### 2. Convert Bullets to Spoken Transitions
| Original | Spoken Version |
|----------|---------------|
| `- First item` | "First, ..." |
| `- Second item` | "Next, ..." |
| `- Third item` | "And finally, ..." |
| Numbered list 1, 2, 3 | "Step one... Step two... Step three..." |

### 3. Handle Code Blocks

**Never read code aloud verbatim.** Instead:

| Code Block | Spoken Version |
|-----------|---------------|
| `npm install express` | "Install the express package using npm." |
| `const app = express()` | "Create a new Express application." |
| Multi-line function | "The function takes a request and response, validates the input, and returns the result as JSON." |
| Config file (JSON/YAML) | "Configure the server with port 3000 and enable debug logging." |

### 4. Expand Technical Shorthand
| Original | Spoken Version |
|----------|---------------|
| API | "A-P-I" or "API" (ElevenLabs handles this well) |
| v2.3.1 | "version two point three point one" |
| Node.js | "Node JS" |
| npm | "N-P-M" |
| REST | "REST" (spoken as a word) |
| SQL | "S-Q-L" or "sequel" |
| URL | "U-R-L" |
| i.e. | "that is" |
| e.g. | "for example" |
| etc. | "and so on" |
| CLI | "C-L-I" or "command line" |

### 5. Simplify Complex Sentences

Technical writing often has long, clause-heavy sentences. Break them up.

**Before:**
> "The middleware, which is responsible for authentication and can be configured with multiple strategies including JWT, OAuth, and session-based auth, should be initialized before any route handlers."

**After:**
> "The middleware handles authentication. It supports JWT, OAuth, and session-based auth. Initialize it before your route handlers."

## Segmentation Strategy

### Break at Heading Boundaries

Split documentation at H2 (`##`) headings. Each section becomes one audio segment.

```
doc_intro.mp3        ← Everything before the first H2
doc_installation.mp3 ← ## Installation
doc_quickstart.mp3   ← ## Quick Start
doc_api.mp3          ← ## API Reference
doc_faq.mp3          ← ## FAQ
```

### Concatenate with Silence Gaps

Add 1.5s silence between sections (longer than narrative — gives the listener time to context-switch):

```bash
# Generate 1.5s silence
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1.5 silence.mp3

# Concatenate with silence between sections
ffmpeg -i doc_intro.mp3 -i silence.mp3 -i doc_installation.mp3 -i silence.mp3 \
  -i doc_quickstart.mp3 -filter_complex "concat=n=5:v=0:a=1" doc_full.mp3
```

### Section Announcements

For long docs, announce each section:
> "Section three: API Reference."

Then pause (use `...` or paragraph break) before the content. This helps listeners orient themselves.

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Robot reads `## Installation` literally | Markdown not stripped | Clean all markdown formatting before generation |
| Voice reads code character by character | Code block passed as text | Describe code in natural language, never read it verbatim |
| Monotone, boring output | Stability too high for long content | Use 0.50–0.55 stability, add style 0.10–0.15 |
| "Vee-two-dot-three" for v2.3 | Model misreads version numbers | Write "version two point three" |
| Listener loses place in long docs | No section markers or pauses | Add section announcements and 1.5s silence gaps |
| Abbreviations mispronounced | Model guesses pronunciation | Expand abbreviations in the text cleanup step |
