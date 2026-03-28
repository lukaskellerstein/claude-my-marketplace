we need to add a plugin (web-design-plugin) that we will use everytime, we need to design a website or webapp. 
The plugin should leverage the /home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/design-plugin.

Example of usage:
- "Generate a website for a company described in file: <path to the file>"
- "Generate a 5 different designs for a project described in file: <path to file>. Use extensive animations. Visually attractive. Colorful."


The plugin should avoid "AI slop", should have defined a "workflow" that he should follow.

Workflow:
1) Understand - ask questions if you have some, everything should be clear. Read relevant code, ask clarifying questions, identify gaps and opportunities. 
2) Plan - Create a plan, get user approval, iterate if needed
3) Document - create documentation (for each design/version)
    a) define design system / styleguide, colors (palletes), fonts, design language, style (/home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/design-plugin/skills/styleguide)
    b) define pages/sections and their content
        b1) for each page/section define layout composition (/home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/design-plugin/skills/frontend-aesthetics)
        b2) for each page/section define media prompts (/home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/design-plugin/skills/media-prompt-craft). Use and define images and videos, or music (provide description for music), or speech (provide text for speech).
        b3) define overall animations, and some specific animations for elements - ex. scrolling animations, bumping, jumping ... etc. Use CSS animations, or more professional ones via GSAP.
        b4) define icons if needed, their description or name. /home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/media-plugin/skills/icon-library
        b5) define text content for elements that should contain text content
        b6) define mocked data for elements that needs them
4) CSS styling
    a) based on the 3a - design system, styleguide ... atd. Define global SCSS classes, colors ... etc.
    b) based on layout 3b1 define layout classes
5) Implement, in parallel fashion. Each part = separate agent
    a) generate structure (HTML,CSS,JS,react) - use predefined CSS classes
    b) use text content, use mock data
    c) get media needed - images, videos, speech, music
    d) get icons
    e) apply animations
    f) test functionality, fix bugs, repeat.
    g) test how it looks, fix visual incostintency, repeat. 
6) Test
    a) test overall functionality, fix, repeat.
    b) test visual consistency, fix, repeat.


When the first workflow is done, user have option to start another agent:
- Critique skill -> start multiple agents, that would review the design, click throught the web, and propose changes, improvements.
- Variation skill -> start multiple Variant agent, that would generate X (defined by user how many) similar designs. 


Tech stack:
Default stack tech is HTML, CSS, React, Vite. 
Animations via CSS or GSAP.
Graphs and charts via mermaid of D3.js. = skill /home/lukas/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/documentation-plugin/skills/graph-generation
UI components via shadcn, tailwind css.