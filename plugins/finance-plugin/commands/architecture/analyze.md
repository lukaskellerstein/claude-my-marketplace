---
description: Analyze existing architecture for issues and improvements
---

# Analyze Command

Analyze current architecture for patterns, anti-patterns, and improvements.

## Usage

`/analyze`

## Aspects

- `dependencies` - Analyze service dependencies
- `coupling` - Check coupling between components
- `complexity` - Measure system complexity
- `patterns` - Identify design patterns
- `anti-patterns` - Detect anti-patterns
- `all` - Complete analysis

## Implementation

Parse the aspect argument (default to "all" if not provided).

### Dependencies Analysis

1. Find all package/dependency files:
   - package.json (Node.js)
   - go.mod (Go)
   - requirements.txt (Python)
   - pom.xml (Java)
   - Cargo.toml (Rust)
2. Analyze dependency graph
3. Identify circular dependencies
4. Check for outdated dependencies
5. Invoke `patterns-expert` agent for insights

### Coupling Analysis

Invoke the `coupling-analysis` skill to:

1. Measure afferent coupling (Ca)
2. Measure efferent coupling (Ce)
3. Calculate instability metric (I = Ce / (Ca + Ce))
4. Identify tight coupling issues
5. Generate coupling matrix
6. Provide recommendations for decoupling

### Complexity Analysis

1. Count services/modules
2. Count API endpoints per service
3. Analyze dependencies per service
4. Calculate cyclomatic complexity
5. Measure code duplication
6. Identify god objects/services
7. Generate complexity report

### Patterns Analysis

Invoke the `patterns-expert` agent to:

1. Detect creational patterns (Factory, Builder, Singleton)
2. Detect structural patterns (Adapter, Facade, Proxy)
3. Detect behavioral patterns (Strategy, Observer, Command)
4. Detect integration patterns (Gateway, Translator)
5. Document found patterns

### Anti-Patterns Detection

Invoke the `anti-patterns` skill to detect:

1. Distributed Monolith
2. Chatty Services (>10 calls between services)
3. Shared Database
4. God Service (>20 endpoints)
5. Anemic Services
6. Big Ball of Mud
7. Circular Dependencies
8. Missing Abstraction Layers

### Complete Analysis

Run all above analyses and:

1. Generate comprehensive report
2. Prioritize issues by severity
3. Provide actionable recommendations
4. Create improvement roadmap
5. Generate architecture diagrams showing issues

## Output Format

Present analysis results with:

1. Executive Summary
2. Metrics Dashboard
3. Issues by Severity (Critical, High, Medium, Low)
4. Detailed Findings
5. Recommendations
6. Next Steps
