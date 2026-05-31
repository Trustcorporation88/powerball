# Contributing to Análise Planilha

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Assume good intent in discussions
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/Trustcorporation88/analise-planilha.git
cd analise-planilha
pnpm install
```

### 2. Create a Feature Branch

Use clear, descriptive names:

```bash
git checkout -b feature/add-export-feature
git checkout -b fix/excel-parser-date-bug
git checkout -b docs/update-readme
git checkout -b refactor/optimize-dashboard
```

**Branch Naming Convention:**
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code improvements
- `perf/*` - Performance optimizations
- `test/*` - Test additions/fixes

### 3. Make Changes

Follow these guidelines:

#### Code Style
- Use TypeScript for all new code
- Follow existing code patterns
- Run `pnpm lint --fix` before committing
- Add type annotations (avoid `any`)

#### Commit Messages

Write clear, descriptive messages following the format:

```
<type>: <subject>

<body (optional)>

Fixes #123
Co-Authored-By: Oz <oz-agent@warp.dev>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Tests
- `chore:` - Build, dependencies, etc.

**Example:**

```
feat: add column freeze functionality to dashboard

Implement ability to freeze columns during horizontal scroll.
Uses shadcn/ui Dialog for column selection.

Fixes #45
Co-Authored-By: Oz <oz-agent@warp.dev>
```

### 4. Test Your Changes

```bash
# Check code quality
pnpm lint

# Build production bundle
pnpm build

# Verify no TypeScript errors
# (If typecheck script exists)
pnpm typecheck
```

### 5. Push & Open PR

```bash
git push origin feature/your-feature-name
```

Then:
1. Go to GitHub repo
2. Click "Compare & pull request"
3. Fill PR description (use template below)
4. Reference related issues: `Fixes #123` or `Related to #456`

## Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Breaking change

## Related Issues
Fixes #(issue number)

## Testing
How to test:
1. Step 1
2. Step 2

## Checklist
- [ ] Code follows style guidelines
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] No breaking changes
- [ ] Self-review done
- [ ] Comments added for complex logic
```

## Development Workflow

### Useful Commands

```bash
# Start dev server with hot reload
pnpm dev

# Check for linting issues
pnpm lint
pnpm lint --fix  # Auto-fix issues

# Build for production
pnpm build

# Preview production build
pnpm preview

# Check TypeScript errors
npx tsc --noEmit
```

### File Organization

New components should follow this structure:

```
src/components/MyFeature/
├── MyFeature.tsx          # Main component
├── MyFeature.test.tsx     # Tests (optional for now)
├── MyFeature.css          # Styles if needed
└── index.ts               # Barrel export
```

### Component Guidelines

- Use functional components with hooks
- Prefer TypeScript types over PropTypes
- Add JSDoc comments for public APIs
- Use shadcn/ui components when possible
- Keep components small and focused

**Example:**

```typescript
interface MyComponentProps {
  title: string;
  onClose: () => void;
}

/**
 * Displays a modal dialog with title and close button.
 * @param title - The modal title
 * @param onClose - Callback when close button is clicked
 */
export function MyComponent({ title, onClose }: MyComponentProps) {
  return (
    <Dialog>
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </Dialog>
  );
}
```

## Review Process

### For Reviewers
- Be constructive and helpful
- Approve when ready
- Request changes if issues found
- Comment with specific line references

### For Authors
- Respond to feedback promptly
- Request re-review after changes
- Avoid force-pushing if PR is under review
- Thank reviewers for feedback

## Common Issues

### Lint Fails
```bash
pnpm lint --fix
# Commit fixes
```

### TypeScript Errors
```bash
# Check all types
npx tsc --noEmit

# Fix reported issues
```

### Build Fails
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
pnpm install
pnpm build
```

### Dependencies
- Use `pnpm` only (not npm/yarn)
- Update `package.json` for dependency changes
- Run `pnpm install` after updating lockfile

## Major Changes

For significant changes:

1. **Create an Issue first** to discuss approach
2. **Get approval** before starting work
3. **Create draft PR** early for feedback
4. **Document changes** thoroughly
5. **Update tests** if applicable

## Documentation

- Update README if behavior changes
- Add comments for complex logic
- Update `.env.example` if new vars added
- Create/update docs for new features

## Questions?

- Check existing issues/PRs
- Ask in discussions section
- Open an issue with `[Question]` prefix

## Thank You!

Your contributions make this project better. We appreciate your time and effort! 🙌
