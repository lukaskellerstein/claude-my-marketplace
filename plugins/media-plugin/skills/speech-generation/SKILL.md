---
name: speech-generation
description: Generate text-to-speech audio using the media-mcp server's generate_speech tool. Use when the user asks to create voiceovers, narration, audio from text, spoken dialogue, podcast-style audio, audiobook readings, announcements, or voice content. Supports 8 voice options, multi-speaker dialogue, and natural language style instructions for controlling tone, pace, and emotion.
---

# Speech Generation (Text-to-Speech)

Use the `mcp__media-mcp__generate_speech` tool to convert text to natural-sounding speech via Google Gemini.

## When to Use

- User asks to "read this aloud", "create a voiceover", "generate narration"
- User wants audio versions of text content
- User needs dialogue with multiple speakers
- User wants podcast-style audio, announcements, or voice prompts
- User is creating audio for a video or presentation

## Tool Reference

### generate_speech

**Key parameters:**

| Parameter | Type | Description |
|---|---|---|
| `text` | string (required) | The text to convert to speech |
| `voice` | string | Voice selection (8 options available) |
| `multi_speaker` | object | Speaker-to-voice mapping for dialogue |
| `style` | string | Natural language style instructions |

## Voice Selection

Choose a voice that matches the content's tone and audience. The tool provides 8 distinct voices — experiment to find the best fit for each use case.

### Matching voices to content

| Content type | Voice criteria |
|---|---|
| Technical tutorial | Clear, measured, neutral pace |
| Marketing/promo | Energetic, warm, confident |
| Narration/story | Expressive, varied pacing |
| Announcement | Authoritative, clear, professional |
| Conversational | Natural, relaxed, friendly |

## Style Instructions

The `style` parameter accepts natural language descriptions of how the speech should sound.

### Tone
- "Speak in a warm, friendly tone"
- "Professional and authoritative"
- "Casual and conversational, like talking to a friend"
- "Calm and soothing, like a meditation guide"
- "Excited and enthusiastic"

### Pace
- "Speak slowly and clearly, with pauses between sentences"
- "Normal conversational pace"
- "Quick and energetic"
- "Measured and deliberate, emphasizing key words"

### Emotion
- "Speak with genuine curiosity and wonder"
- "Confident and reassuring"
- "Urgent, like breaking news"
- "Gentle and empathetic"

### Combined style examples
```
"Speak in a warm, professional tone at a moderate pace.
Emphasize technical terms slightly. Add brief pauses
before important points."
```

```
"Casual and upbeat, like a tech YouTuber explaining
a cool new feature. Slightly faster pace, with
enthusiasm on key benefits."
```

## Multi-Speaker Dialogue

For content with multiple speakers, use the `multi_speaker` parameter to assign voices.

### Format

Mark speakers in the text, then map them to voices:

**Text:**
```
[Host]: Welcome to the show! Today we're talking about AI.
[Guest]: Thanks for having me. I'm excited to dive in.
[Host]: Let's start with the basics. What is machine learning?
[Guest]: At its core, machine learning is about pattern recognition...
```

**multi_speaker mapping:**
```json
{
  "Host": "voice_1",
  "Guest": "voice_2"
}
```

### Use cases for multi-speaker

- **Podcast simulation**: Host + guest conversation
- **Tutorial dialogue**: Instructor + student Q&A
- **Product demo**: Narrator + user voices
- **Audiobook**: Different characters with distinct voices
- **Interview**: Interviewer + interviewee

## Common Patterns

### Documentation narration
Convert a README or guide into audio:
```
Text: [the documentation content]
Style: "Clear and professional, like a technical narrator.
       Moderate pace with pauses between sections.
       Pronounce technical terms carefully."
```

### Video voiceover
Create narration for a product video:
```
Text: "Introducing our new dashboard. With real-time analytics,
      you can track performance at a glance. Drag and drop widgets
      to customize your view. Export reports with a single click."
Style: "Confident and polished, like a product launch video.
       Measured pace, slight emphasis on feature names."
```

### Announcement / notification
Short-form audio for apps or systems:
```
Text: "Your deployment is complete. All 12 services are running."
Style: "Brief and clear, neutral professional tone."
```

### Story / narrative
Creative content narration:
```
Text: [story content]
Style: "Expressive storyteller voice, varied pacing — slower
       for dramatic moments, slightly faster for action.
       Pause before dialogue."
```

### Multi-language consideration
The tool generates speech based on the text language. Write text in the target language for non-English output.

## Combining with Other Media Skills

### Voiceover + Video
1. Generate the video with `generate_video`
2. Generate the voiceover with `generate_speech`
3. Combine with ffmpeg: `ffmpeg -i video.mp4 -i voiceover.wav -c:v copy -c:a aac output.mp4`

### Narration + Background Music
1. Generate narration with `generate_speech`
2. Generate background music with `generate_music`
3. Mix audio: `ffmpeg -i narration.wav -i music.wav -filter_complex "[1:a]volume=0.2[bg];[0:a][bg]amix=inputs=2:duration=longest" output.wav`

### Podcast Production
1. Write dialogue with speaker markers
2. Generate with multi-speaker mode
3. Generate intro/outro jingle with `generate_music`
4. Concatenate: `ffmpeg -i intro.wav -i dialogue.wav -i outro.wav -filter_complex "concat=n=3:v=0:a=1" podcast.wav`

## Tips

- Write text as you want it spoken — use punctuation for natural pauses (commas, periods, ellipses)
- Use "..." for longer pauses: "And the winner is... congratulations!"
- Spell out abbreviations if you want them read as words: "API" vs "A.P.I."
- For numbers, write them as words if pronunciation matters: "twenty-three" vs "23"
- Test with a short sentence first to verify the voice and style before generating long content
- Multi-speaker mode produces more natural results for dialogue than generating each speaker separately
