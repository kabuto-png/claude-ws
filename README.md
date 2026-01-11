# Claude Kanban

A visual Kanban board interface for managing tasks powered by Claude Code CLI. Organize your AI-assisted development workflow with drag-and-drop task management, real-time streaming responses, and integrated file browsing.

## Features

- **Kanban Board** - Drag-and-drop task management with columns: To Do, In Progress, In Review, Done, Cancelled
- **Claude Code Integration** - Execute prompts directly through Claude Code CLI with real-time streaming output
- **Multi-Project Support** - Manage multiple project workspaces with separate task boards
- **File Browser** - Integrated file explorer with search, preview, and git status indicators
- **Git Integration** - View changes, diffs, commit history, and perform git operations
- **Conversation History** - Track all attempts per task with full conversation logs
- **Checkpoints** - Save and rewind to previous conversation states
- **File Attachments** - Attach files to prompts for context
- **Theme Support** - Multiple themes including Dracula, VS Code Light/Dark, and system defaults
- **Real-time Updates** - Socket.io powered live streaming of Claude responses

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4 with CSS variables
- **Database**: SQLite with Drizzle ORM
- **Real-time**: Socket.io for streaming
- **UI Components**: Radix UI primitives
- **Drag & Drop**: dnd-kit
- **State Management**: Zustand

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd claude-kanban

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate
```

### Development

```bash
# Start development server (includes Socket.io)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── tasks/         # Task CRUD
│   │   ├── attempts/      # Attempt management
│   │   ├── projects/      # Project management
│   │   ├── git/           # Git operations
│   │   ├── files/         # File system access
│   │   ├── search/        # File/content search
│   │   ├── checkpoints/   # Conversation checkpoints
│   │   └── uploads/       # File attachments
│   └── page.tsx           # Main application
├── components/
│   ├── kanban/            # Board, Column, TaskCard
│   ├── task/              # Task detail panel, conversation view
│   ├── claude/            # Response rendering, code blocks
│   ├── sidebar/           # File browser, git panel
│   ├── settings/          # Settings dialog
│   └── ui/                # Shared UI components
├── lib/
│   ├── db/                # Database schema and connection
│   ├── process-manager.ts # Claude CLI process management
│   └── utils.ts           # Utilities
├── stores/                # Zustand stores
└── types/                 # TypeScript definitions
```

## Database Schema

| Table | Description |
|-------|-------------|
| `projects` | Workspace configurations with name and path |
| `tasks` | Kanban cards with status and position |
| `attempts` | Prompt submissions with streaming output |
| `attempt_logs` | Chunked streaming logs (stdout/stderr/json) |
| `attempt_files` | File attachments per attempt |
| `checkpoints` | Conversation state snapshots for rewind |

## Themes

Available themes in Settings > Appearance:

- **Default Light** - Clean light theme
- **Default Dark** - Modern dark theme
- **VS Code Light** - Visual Studio Code Light+ colors
- **VS Code Dark** - Visual Studio Code Dark+ colors
- **Dracula** - Official Dracula color scheme

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Socket.io |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |

## License

MIT
