import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bookmarks = pgTable("bookmarks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "bookmarks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer().notNull(),
	title: varchar().notNull(),
	description: varchar(),
	url: varchar().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	firstName: varchar().notNull(),
	lastName: varchar().notNull(),
	email: varchar().notNull(),
	password: varchar().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
