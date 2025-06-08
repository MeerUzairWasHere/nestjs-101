import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { usersTable } from './schema';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  const user: typeof usersTable.$inferInsert = {
    firstName: 'John',
    lastName: 'Doe',
    password: '123456',
    email: 'john@example.com',
  };
  await db.insert(usersTable).values(user);
  console.log('New user created!');
  const users = await db.select().from(usersTable);
  console.log('Getting all users from the database: ', users);
}
main();
