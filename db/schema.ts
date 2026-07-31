import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creatorId: text("creator_id").notNull(),
  word: text("word").notNull(),
  story: text("story").notNull(),
  rawFileKey: text("raw_file_key").notNull(),
  editedFileKey: text("edited_file_key").notNull(),
  imageHash: text("image_hash").notNull(),
  submitterHash: text("submitter_hash").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "expired"] }).notNull().default("pending"),
  moderationStatus: text("moderation_status", { enum: ["pending", "flagged", "cleared"] }).notNull().default("pending"),
  moderationNotes: text("moderation_notes"),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  reviewedAt: text("reviewed_at"),
});

export const artworks = sqliteTable("artworks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().unique(),
  word: text("word").notNull(),
  story: text("story").notNull(),
  artistName: text("artist_name").notNull(),
  displayFileKey: text("display_file_key").notNull(),
  status: text("status", { enum: ["rotation", "archive"] }).notNull().default("rotation"),
  rotationEndsAt: text("rotation_ends_at").notNull(),
  publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artworkId: integer("artwork_id").notNull(),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  moderationNotes: text("moderation_notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
