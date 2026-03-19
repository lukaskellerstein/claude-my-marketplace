# Multilingual Reference

Cross-language speech production, localization, and multi-language workflows.

## Model Comparison

| Model | Languages | Quality | Accent Fidelity | Best For |
|-------|-----------|---------|-----------------|----------|
| `eleven_v3` | 70+ | Highest | Best | **Default** — widest support, best pronunciation |
| `eleven_multilingual_v2` | 29 | High | Good | Proven, stable. Good fallback for supported languages. |
| `eleven_flash_v2_5` | 32 | Good | Moderate | Low-latency multilingual. Interactive use. |
| `eleven_turbo_v2_5` | 32 | Good | Moderate | Batch multilingual processing |

**Decision:** Use `eleven_v3` unless you need ultra-low latency (use `eleven_flash_v2_5`) or are reproducing output from a previous `eleven_multilingual_v2` project.

## Supported Languages

### Tier 1 — Native Quality
Languages with the most training data. Output is near-indistinguishable from native speakers.

| Language | ISO Code | `language` param | All Models |
|----------|----------|-----------------|------------|
| English | en | `en` | Yes |
| Spanish | es | `es` | Yes |
| French | fr | `fr` | Yes |
| German | de | `de` | Yes |
| Italian | it | `it` | Yes |
| Portuguese | pt | `pt` | Yes |
| Japanese | ja | `ja` | Yes |
| Chinese (Mandarin) | zh | `zh` | Yes |
| Korean | ko | `ko` | Yes |

### Tier 2 — High Quality
Excellent output with occasional minor accent artifacts.

| Language | ISO Code | `language` param | v3 | multilingual_v2 | flash_v2_5 |
|----------|----------|-----------------|-----|-----------------|------------|
| Dutch | nl | `nl` | Yes | Yes | Yes |
| Polish | pl | `pl` | Yes | Yes | Yes |
| Russian | ru | `ru` | Yes | Yes | Yes |
| Swedish | sv | `sv` | Yes | Yes | Yes |
| Turkish | tr | `tr` | Yes | Yes | Yes |
| Arabic | ar | `ar` | Yes | Yes | Yes |
| Hindi | hi | `hi` | Yes | Yes | Yes |
| Indonesian | id | `id` | Yes | Yes | Yes |
| Czech | cs | `cs` | Yes | Yes | Yes |
| Romanian | ro | `ro` | Yes | Yes | Yes |

### Tier 3 — Good Quality (eleven_v3 only)
Available only on `eleven_v3`. Quality varies — test before committing to production.

| Language | ISO Code | `language` param |
|----------|----------|-----------------|
| Thai | th | `th` |
| Vietnamese | vi | `vi` |
| Ukrainian | uk | `uk` |
| Greek | el | `el` |
| Hebrew | he | `he` |
| Bulgarian | bg | `bg` |
| Croatian | hr | `hr` |
| Serbian | sr | `sr` |
| Slovak | sk | `sk` |
| Finnish | fi | `fi` |
| Danish | da | `da` |
| Norwegian | no | `no` |
| Malay | ms | `ms` |
| Filipino | fil | `fil` |
| Swahili | sw | `sw` |

## Mixed-Language Strategy

When content contains multiple languages (e.g., an English presentation with Spanish quotes):

### Rule: Generate Each Language Separately

**Never mix languages in a single generation call.** The model will default to one language's phonetics and mangle the other.

### Workflow

1. Split text by language:
   ```
   EN: "Here's what our users in Mexico City told us."
   ES: "Este producto cambió la forma en que trabajamos."
   EN: "That translates to: this product changed how we work."
   ```

2. Generate each segment with the correct `language` parameter:
   ```
   segment_en_01.mp3  → language: "en"
   segment_es_01.mp3  → language: "es"
   segment_en_02.mp3  → language: "en"
   ```

3. Concatenate with natural pauses:
   ```bash
   ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 pause.mp3
   ffmpeg -i seg_en_01.mp3 -i pause.mp3 -i seg_es_01.mp3 -i pause.mp3 \
     -i seg_en_02.mp3 -filter_complex "concat=n=5:v=0:a=1" mixed_language.mp3
   ```

### Voice Consistency Across Languages

- Use the **same voice_id** for all languages — ElevenLabs multilingual voices maintain identity across languages
- Keep **identical parameters** (stability, similarity_boost, style, speed)
- The voice will naturally adapt its accent to the target language

## Pronunciation Hints

### Proper Nouns and Brand Names

ElevenLabs may mispronounce unfamiliar proper nouns. Use phonetic spelling:

| Original | Phonetic Version | Context |
|----------|-----------------|---------|
| Kubernetes | Koo-ber-net-eez | Tech term |
| Figma | Fig-muh | Brand |
| Xiaomi | Shao-mee | Brand |
| Huawei | Hwah-way | Brand |
| São Paulo | Sow Pow-lo | City |
| München | Moon-shen | City |
| Nguyen | Win | Name |

### When to Use Phonetic Hints

- **Always** for brand names, city names, and personal names that are commonly mispronounced
- **Test first** — generate a short test with the original spelling. If correct, don't add hints.
- **Phonetic hints go in the text**, not as a separate parameter

### Number and Date Formatting by Language

| Language | Number Format | Date Format | Example |
|----------|--------------|-------------|---------|
| English | "one thousand two hundred" | "March fifteenth, twenty twenty-six" | Standard |
| Spanish | "mil doscientos" | "quince de marzo de dos mil veintiséis" | Write out |
| French | "mille deux cents" | "le quinze mars deux mille vingt-six" | Write out |
| German | "eintausendzweihundert" | "fünfzehnter März zweitausendsechsundzwanzig" | Write out |
| Japanese | "千二百" or "sen nihyaku" | Use kanji or romaji as needed | Test both |

## Localization Batch Workflow

When generating the same content in multiple languages:

1. **Prepare the source text** in the primary language
2. **Translate** to all target languages (ensure translations are natural, not literal)
3. **Create a generation manifest**:

   | Language | Text File | Voice ID | Language Param | Output File |
   |----------|----------|----------|---------------|-------------|
   | English | text_en.txt | `voice_abc123` | `en` | output_en.mp3 |
   | Spanish | text_es.txt | `voice_abc123` | `es` | output_es.mp3 |
   | French | text_fr.txt | `voice_abc123` | `fr` | output_fr.mp3 |

4. **Generate all versions** using the same voice_id and parameters
5. **Review each language** with a native speaker if possible
6. **Normalize loudness** across all versions:
   ```bash
   for f in output_*.mp3; do
     ffmpeg -i "$f" -af loudnorm=I=-16:TP=-1.5:LRA=11 "normalized_$f"
   done
   ```

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Foreign words pronounced with English phonetics | Mixed languages in one call | Generate each language separately |
| Accent sounds wrong | Using monolingual model for non-English | Use `eleven_v3` or `eleven_multilingual_v2` |
| Brand name mispronounced | Model doesn't know the word | Use phonetic spelling in the text |
| Inconsistent voice across languages | Using voice_name instead of voice_id | Always use voice_id for cross-language consistency |
| Numbers read as digits | "1200" read as "one-two-zero-zero" | Write numbers as words in the target language |
| Tier 3 language sounds robotic | Less training data for that language | Test early, consider Tier 1/2 alternative if quality insufficient |
