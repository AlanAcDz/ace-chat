# AceChat 🚀

**Self-hostable, privacy-focused, and powerful AI chat application.**

AceChat is an open-source chat application inspired by `t3chat`, designed to be fully self-hostable on low-power devices like a Raspberry Pi. Our core philosophy emphasizes data privacy, user ownership, and high performance in a resource-constrained environment.

<!-- Placeholder for a screenshot or demo GIF -->
<!-- ![AceChat Demo](link-to-your-demo.gif) -->

---

## ✨ Features

- **🧠 Chat with Various LLMs**: Supports multiple language models and providers (OpenAI, Anthropic, Google, LM Studio, Ollama, OpenRouter).
- **🔑 Bring Your Own Key**: Users can securely use their own API keys.
- **🔒 Authentication & Sync**: User authentication with chat history synchronization.
- **📎 Attachment Support**: Upload and use files (images and PDFs) in your chats.
- **🎨 Image Generation**: AI-powered image generation for select models.
- **💻 Syntax Highlighting**: Beautiful code formatting and highlighting.
- **🔀 Chat Branching**: Create alternative conversation paths.
- **✍️ Chat Actions**: Retry assistant messages or edit your own.
- **🔗 Chat Sharing**: Share conversations with others on your network.
- **🌐 Web Search**: Integrate real-time web search into your conversations.
- **👥 User Management**: The main user can create and manage other users.
- **🌍 i18n**: Multi-language support (English and Spanish).

## 🛠️ Technology Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- **UI**: [TailwindCSS v4](https://tailwindcss.com/) & [shadcn-svelte](https://www.shadcn-svelte.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Lucia Auth](https://lucia-auth.com/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/)
- **Deployment**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Package Manager**: [Bun](https://bun.sh/)

---

## 🚀 Getting Started (Self-Hosting with Docker)

The recommended way to run AceChat is with Docker. It's fast, easy, and isolates the environment.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Get the Code**
    Clone or download this repository to your local machine and navigate into the project directory.

2.  **Configure Environment Variables**
    Create a `.env` file by copying the example file. This file will hold your configuration.

    ```bash
    cp .env.example .env
    ```

    You can open `.env` and modify variables like `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `APP_PORT` if needed. The defaults are fine for a standard setup.

3.  **Launch the Application**
    Use Docker Compose to build and start the services.

    ```bash
    docker compose up -d
    ```

    This command builds the app's Docker image and starts the application and database containers in the background. The first time you run this, it might take a few minutes to download and build everything.

4.  **Access AceChat**
    Your self-hosted AI chat is now running! Open your browser and navigate to `http://localhost:3000` (or the custom `APP_PORT` you set). The first user to sign up will be granted administrative privileges.

### Managing the Application

- **To stop the application:**
  ```bash
  docker compose down
  ```
- **To view logs:**
  ```bash
  docker compose logs -f app
  ```

---

## 💻 Local Development

If you want to contribute to the project or run it directly on your machine.

### Prerequisites

- [Bun](https://bun.sh/docs/installation)
- [Docker](https://docs.docker.com/get-docker/) (for the database)

### Installation

1.  **Get the code and install dependencies:**

    ```bash
    # Make sure you are in the project's root directory
    bun install
    ```

2.  **Set up the environment file:**

    ```bash
    cp .env.example .env
    ```

    The default `DATABASE_URL` is already configured for the local Docker database.

3.  **Start the database container:**

    ```bash
    bun run db:dev
    ```

4.  **Run database migrations:**
    Apply the database schema to your local database.

    ```bash
    bun run db:migrate
    ```

5.  **Start the development server:**
    ```bash
    bun run dev
    ```
    The application will be available at the address shown in your terminal (usually `http://localhost:5173`).

### Useful Scripts

- `bun run dev`: Start the development server.
- `bun run build`: Build the app for production.
- `bun run check`: Type-check the code with Svelte Check.
- `bun run lint`: Lint the code with ESLint.
- `bun run format`: Format code with Prettier.
- `bun run db:studio`: Open Drizzle Studio to browse your database.

---

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or submit a pull request.
