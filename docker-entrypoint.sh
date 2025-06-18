#!/bin/sh
set -e

echo "🚀 Starting Ace Chat setup..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until bun --eval "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
await sql\`SELECT 1\`;
await sql.end();
console.log('Database connected successfully');
" 2>/dev/null; do
  echo "Database not ready, waiting 2 seconds..."
  sleep 2
done

# Run migrations
echo "🔄 Running database migrations..."
bun run db:migrate

echo "✅ Setup complete! Starting application..."

# Start the application
exec "$@" 