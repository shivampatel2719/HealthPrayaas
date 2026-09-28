import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/password.js";
import { db, pool } from "./client.js";
import { classes, sections, students, users } from "./schema.js";

async function seed() {
  const [existingAdmin] = await db.select().from(users).where(eq(users.email, "admin@healthprayaas.dev"));

  if (existingAdmin) {
    console.log("Seed data already present, skipping.");
    return;
  }

  await db.insert(users).values([
    {
      email: "admin@healthprayaas.dev",
      passwordHash: await hashPassword("admin123"),
      fullName: "Admin User",
      role: "admin",
    },
    {
      email: "teacher@healthprayaas.dev",
      passwordHash: await hashPassword("teacher123"),
      fullName: "Sample Teacher",
      role: "teacher",
    },
    {
      email: "health@healthprayaas.dev",
      passwordHash: await hashPassword("health123"),
      fullName: "Sample Health Staff",
      role: "health_staff",
    },
  ]);

  const [grade5, grade6] = await db
    .insert(classes)
    .values([
      { name: "Grade 5", gradeLevel: 5 },
      { name: "Grade 6", gradeLevel: 6 },
    ])
    .returning();

  const [grade5A, grade5B, grade6A] = await db
    .insert(sections)
    .values([
      { classId: grade5.id, name: "A" },
      { classId: grade5.id, name: "B" },
      { classId: grade6.id, name: "A" },
    ])
    .returning();

  await db.insert(students).values([
    { sectionId: grade5A.id, rollNumber: "1", fullName: "Aarav Shah", dateOfBirth: "2015-04-12", gender: "male" },
    { sectionId: grade5A.id, rollNumber: "2", fullName: "Diya Patel", dateOfBirth: "2015-07-03", gender: "female" },
    { sectionId: grade5A.id, rollNumber: "3", fullName: "Kabir Mehta", dateOfBirth: "2015-01-21", gender: "male" },
    { sectionId: grade5B.id, rollNumber: "1", fullName: "Isha Nair", dateOfBirth: "2015-09-08", gender: "female" },
    { sectionId: grade5B.id, rollNumber: "2", fullName: "Vihaan Rao", dateOfBirth: "2015-11-30", gender: "male" },
    { sectionId: grade6A.id, rollNumber: "1", fullName: "Anaya Joshi", dateOfBirth: "2014-03-17", gender: "female" },
    { sectionId: grade6A.id, rollNumber: "2", fullName: "Reyansh Gupta", dateOfBirth: "2014-06-25", gender: "male" },
  ]);

  console.log("Seed data created: 3 users, 2 classes, 3 sections, 7 students.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
