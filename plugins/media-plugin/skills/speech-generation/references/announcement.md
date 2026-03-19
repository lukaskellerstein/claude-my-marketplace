# Announcement Reference

Notifications, IVR/phone menus, system messages, alerts, and public address content.

## Presets

| Use Case | stability | similarity_boost | style | speed | Voice Traits |
|----------|-----------|-------------------|-------|-------|-------------|
| **IVR / Phone Menu** | 0.85 | 0.90 | 0.00 | 1.00 | Flat, professional, robotic consistency. |
| **App Notification** | 0.75 | 0.85 | 0.05 | 1.05 | Clear, brief, slightly warm. Not robotic. |
| **System Alert** | 0.90 | 0.90 | 0.00 | 1.00 | Maximum consistency, zero expressiveness. |
| **Public Address** | 0.70 | 0.80 | 0.10 | 0.90 | Authoritative, clear, slightly slower for comprehension. |
| **Friendly Notification** | 0.60 | 0.80 | 0.15 | 1.00 | Warm, approachable. For consumer apps. |

## Output Format by Platform

| Platform | Format | Why |
|----------|--------|-----|
| **Twilio** (calls, SMS voice) | `ulaw_8000` | Required format for Twilio voice API |
| **Dialogflow / Google** | `pcm_16000` | Standard for Google voice platforms |
| **Amazon Connect** | `pcm_16000` | AWS telephony standard |
| **Web apps** | `mp3_44100_128` | Universal browser support |
| **Mobile push notifications** | `mp3_44100_128` | Small file, wide compatibility |
| **WebRTC / real-time** | `opus_48000_128` | Efficient streaming codec |
| **Embedded systems / IoT** | `ulaw_8000` | Smallest file size, lowest bandwidth |

## Brevity Rules

Announcements must be **short, front-loaded, and unambiguous**.

### The 2-Sentence Rule
No announcement should exceed 2 sentences. If it does, break it into multiple announcements or rethink the message.

### Front-Load Key Information
The most important word or fact comes first.

| Bad | Good |
|-----|------|
| "We wanted to let you know that your deployment has been completed successfully." | "Deployment complete. All 12 services are running." |
| "Due to scheduled maintenance, our servers will be briefly unavailable between 2 and 4 AM." | "Server maintenance tonight, 2 to 4 AM. Expect brief downtime." |
| "Please be advised that your password will expire in 3 days." | "Your password expires in 3 days. Update it now." |

### Number Formatting
| Type | How to Write | Why |
|------|-------------|-----|
| Quantities | "twelve services" (under 20) or "247 requests" (over 20) | Small numbers as words sound natural |
| Times | "2 AM" or "two o'clock" | Depends on formality |
| Dates | "March fifteenth" not "3/15" | Avoid ambiguous formats |
| Percentages | "ninety-five percent" | Always spell out |
| Versions | "version three point two" | Never "v3.2" |

## Consistency Across Announcement Families

When building a set of related announcements (e.g., all system notifications), ensure consistency:

1. **Same voice_id** — use the exact voice_id, not voice_name
2. **Same parameters** — identical stability, similarity_boost, style, speed
3. **Same model** — don't mix models across an announcement family
4. **Same sentence structure** — pick a pattern and stick to it:
   - Pattern A: "[Event]. [Detail]." → "Deployment complete. All services running."
   - Pattern B: "[Subject] [action]." → "Your password expires in 3 days."
   - Pattern C: "[Action required]: [detail]." → "Update required: version 4.2 available."

## Templating Patterns

For announcements with variable content, create templates with consistent framing:

### Status Updates
```
Template: "[Service] is [status]. [Detail]."
Examples:
- "Database is online. All connections restored."
- "API gateway is degraded. Response times may be slower."
- "Build pipeline is complete. 47 tests passed."
```

### User Actions
```
Template: "[Action] [result]. [Next step]."
Examples:
- "Payment processed. Your receipt has been emailed."
- "File uploaded. Processing will take about 2 minutes."
- "Account created. Check your email to verify."
```

### Alerts
```
Template: "[Severity]: [issue]. [Action]."
Examples:
- "Warning: disk usage at ninety-five percent. Free up space."
- "Error: database connection failed. Retrying automatically."
- "Critical: service outage detected. Team has been notified."
```

### IVR Menu
```
Template: "For [option], press [number]."
Examples:
- "For sales, press one. For support, press two. For billing, press three."
- "To repeat this menu, press nine. To speak with an agent, press zero."
```

**IVR tips:**
- Generate each menu option as a separate file for flexible routing
- Use the same voice and parameters for all options in one menu
- Keep each option under 8 words
- Pause 0.5s between options (add `...` between sentences)

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Announcements sound different over time | voice_name resolved to different voice | Use voice_id for all announcements |
| Phone audio sounds tinny | Wrong output format | Use `ulaw_8000` for telephony |
| Message too long for context | Trying to say too much | Apply 2-sentence rule. Split into multiple announcements. |
| User can't understand numbers | "v3.2" or "3/15" read ambiguously | Spell out numbers and dates |
| IVR options blur together | Same pace, no pauses | Add `...` between options, generate each separately |
