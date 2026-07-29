# Narration style

## The one rule

**The picture shows what happens. The narration says why it matters.**

Every weak demo line breaks this rule by describing the interaction the viewer is already
watching. Every strong line adds information the picture cannot carry: the stakes, the
alternative, the number, the consequence.

| Weak | Strong |
|---|---|
| "Now I'll click on the Reconcile button." | "Matching runs on import, so the only rows left are the ones that need a human decision." |
| "Here we can see the dashboard with all our metrics." | "Every number here is last night's close — no one exported anything to build it." |
| "Let's type a search query into the search box." | "Search is semantic, so 'auth flow' finds the diagram that never uses that phrase." |
| "This is our powerful new automation feature." | "The rule runs on every new invoice, which is about four hundred a week for a team this size." |
| "As you can see, the results appear instantly." | "That is eleven million rows, indexed at write time." |

## Voice and tense

- **Present tense.** "The match runs", not "the match will run" or "we ran the match".
- **The product acts, or the user acts — not "we".** "Ledger flags the mismatch" or "you
  approve it". Avoid "we" (it means the vendor, and the viewer is not on the team).
- **Active voice.** "The importer normalises the dates", not "the dates are normalised".
- **Concrete nouns from the domain.** "Bank feed", "purchase order", "flaky test" — not
  "data", "items", "resources".

## Numbers earn trust

One real number is worth a paragraph of adjectives. Use whatever the app actually shows:
row counts, durations, dollar amounts, test counts, file sizes. If the demo data is seeded,
seed it with plausible magnitudes so the numbers you narrate are the numbers on screen.

Never narrate a number the picture contradicts. A viewer who notices will discount
everything after it.

## Banned and discouraged

The validator **errors** on: "as you can see", "in this video", "let's dive in",
"game-changer", "revolutionize", "unleash", "supercharge", "look no further".

The validator **warns** on: "simply", "just click", "powerful", "seamless", "effortless",
"cutting-edge", "state-of-the-art", "robust", "leverage", "utilize", "best-in-class",
"next-level". These are not forbidden, but each one is a place where a specific claim would
have been stronger. If you keep one, have a reason.

It also warns when narration contains "click"/"press"/"tap" outside a `problem` beat, and
when a line stacks three or more "and"-joined claims.

## Length and breath

- 2.2–2.5 words/second. Count words, do not estimate.
- **Read it aloud at that pace.** Running out of breath means the sentence is too long for
  speech, regardless of word count.
- Prefer two short sentences to one long one. Text-to-speech handles full stops well and
  subordinate clauses badly.
- Avoid parentheticals and em-dash asides entirely — they either get flattened into
  monotone or produce an unnatural pause.

## Writing for text-to-speech specifically

- **Spell out** what should be spoken: "twenty-three percent" if you want that read
  naturally, "23%" is usually fine but test it.
- **Acronyms**: "S-D-K" reads letter-by-letter only if the model decides to. For anything
  ambiguous, write the pronunciation in `brief.md` and check the first generated take.
- **Product names** are the most common failure. Listen to the first take of every section
  containing one.
- **Numbers with units**: "four hundred a week" is safer than "400/wk".
- **No stage directions.** "(pause)" gets read aloud. Use a separate section, or let the
  reconciler's lead-in and tail do the work.

## Writing for muted playback

Captions are on by default because most demos are first watched without sound. This means
every line must stand alone as text:

- A line that starts with "And that's why…" reads as a fragment in a caption box.
- A line whose subject is only established by the picture ("this one is the important
  part") is meaningless as text.
- Keep sentences short enough to fit a caption without wrapping to three lines — roughly
  under 16 words per sentence.

## Opening lines

The first six seconds decide whether the rest is watched. Four openings that work:

1. **The cost.** "Month-end close takes most finance teams nine days."
2. **The contradiction.** "This test suite passes locally and fails in CI, about twice a week."
3. **The outcome, stated flatly.** "This report was built without anyone exporting a spreadsheet."
4. **The question the viewer already has.** "How do you know the number in that report is right?"

Openings that do not work: the product name, the company mission, "hi everyone", a feature
list, or anything that begins "in this video".

## Closing lines

The close answers "what do I do now", in one sentence, with one action. Not a recap.

| Weak | Strong |
|---|---|
| "So that's Ledger — automatic reconciliation, full audit trails, and powerful reporting." | "Import last month's statement and see where your close actually stands." |
| "Thanks for watching!" | "The install is one command, and it runs against your existing schema." |

## Silent sections

`"voiceover": ""` is legitimate. A `wow` beat sometimes lands harder with no narration —
just the picture, the music bed, and room to react. Use it deliberately, at most once per
demo, and set `videoLed: true` so the clip's own length defines the section.
