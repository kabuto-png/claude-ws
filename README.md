# Claude Workspace

**A beautifully crafted workspace interface for Claude Code.**

Powerful workspace for Claude Code. Work from anywhere with consistent performance. Intuitive workflow, flexible plugins.

---

## Why Claude Workspace?

### 🌍 Work Everywhere
Coffee shop. Airport lounge. Hotel WiFi. Beach with spotty signal. Claude Workspace runs locally with SQLite—no cloud dependency, no latency spikes. Your workflow travels with you.

### ⚡ Consistent Performance
Same snappy experience whether you're on fiber at home or tethering from your phone. Lightweight footprint. Instant startup. Responsive UI while Claude streams. Performance you can rely on, anywhere.

### 🎯 Unique Workflow
Each task is a conversation. Each conversation has checkpoints. Rewind to any point, branch off, continue later. Your AI workflow adapts to how you think.

### ✨ Intuitive Management
Drag-and-drop across columns. Watch responses stream live. Navigate conversation history. File browser with git status. Everything where you expect it.

### 🔌 Flexible Plugins
Agent Factory manages Claude skills, commands, and agents per project. Install what you need. Your toolkit, your rules.

### 🔋 Powered by Claude Code
Native CLI integration. Real-time streaming. File attachments. Full persistence. All the power, none of the friction.

---

## Features

| Feature | Description |
|---------|-------------|
| **Task Board** | Drag-and-drop tasks: To Do → In Progress → In Review → Done |
| **Real-time Streaming** | Watch Claude's responses stream live via Socket.io |
| **Checkpoints** | Save conversation states, rewind to any point |
| **Conversation History** | Full attempt logs with ability to continue or branch |
| **File Browser** | Integrated explorer with search, preview, git status |
| **Git Integration** | View diffs, commits, and perform git operations |
| **File Attachments** | Attach files to provide context for prompts |
| **Multi-Project** | Manage multiple workspaces with separate boards |
| **Agent Factory** | Discover and manage Claude skills, commands, agents |
| **Themes** | Light, Dark, VS Code Light/Dark, Dracula |

---

## Quick Start

### Option 1: Run with npx (Recommended)

**Prerequisites:** Node.js 20+, pnpm 9+, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

```bash
npx claudews
```

The first run will:
- Auto-create SQLite database in `~/.claude-ws/`
- Run migrations automatically
- Start the server on http://localhost:8556

### Option 2: Install globally

```bash
npm install -g claudews
claudews
```

### Option 3: Development from source

```bash
git clone https://github.com/Claude-Workspace/claude-ws.git
cd claude-ws
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:8556](http://localhost:8556)

---

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Database**: SQLite + Drizzle ORM
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS 4
- **UI**: Radix UI primitives
- **State**: Zustand
- **Drag & Drop**: dnd-kit

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Run database migrations |

---

## License

MIT
