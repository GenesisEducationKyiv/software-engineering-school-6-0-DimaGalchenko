# Project Guidelines

## Overview
Node.js Express REST API service.

## Principles

### Clean Code (Robert C. Martin)
- Use meaningful, descriptive, and pronounceable names for variables, functions, and modules
- Functions should do one thing and do it well
- Functions should be small — prefer extracting logic into well-named helper functions
- Avoid magic numbers and strings — use named constants
- No comments in the code — code should be self-documenting through clear naming and structure
- No dead code — remove unused variables, functions, and imports
- Prefer early returns over deep nesting
- Keep function arguments to a minimum (ideally 0–2)
- Don't repeat yourself (DRY) — extract shared logic

### SOLID
- **Single Responsibility**: each module/function has one reason to change
- **Open/Closed**: extend behavior through new modules, not by modifying existing ones
- **Liskov Substitution**: interchangeable implementations must honor the same contract
- **Interface Segregation**: expose only what consumers need, keep interfaces focused
- **Dependency Inversion**: depend on abstractions (injected dependencies), not concrete implementations

## Code Style
- Use CommonJS (`require`/`module.exports`)
- Use `const` by default, `let` when reassignment is needed, never `var`
- Double quotes for strings
- Semicolons required
- 2-space indentation
- Arrow functions for callbacks

## Project Structure
- Entry point: `index.js`
- Keep route handlers in separate modules under `routes/`
- Keep business logic in `services/`
- Keep middleware in `middleware/`

## Conventions
- Use `express.json()` for body parsing
- Read configuration from environment variables with sensible defaults
- Return JSON responses from all endpoints
- Use proper HTTP status codes (200, 201, 400, 404, 500)
- Handle errors with middleware, don't swallow them silently