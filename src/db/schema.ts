import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar().notNull(),
  lastName: varchar().notNull(),
  email: varchar().notNull(),
  password: varchar().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const bookmarksTable = pgTable('bookmarks', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull(),
  title: varchar().notNull(),
  description: varchar(),
  url: varchar().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
