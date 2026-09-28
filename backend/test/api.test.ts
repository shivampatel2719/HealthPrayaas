import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/client.js";
import { resetDatabase } from "./db.js";
import { createTestUser } from "./helpers.js";

const app = createApp();

async function loginAs(email: string, password: string) {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  return response.body.accessToken as string;
}

describe("auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("logs in with valid credentials and rejects invalid ones", async () => {
    const { password } = await createTestUser("admin@test.dev", "password123", "admin");

    const ok = await request(app).post("/api/auth/login").send({ email: "admin@test.dev", password });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
    expect(ok.body.user.email).toBe("admin@test.dev");

    const bad = await request(app).post("/api/auth/login").send({ email: "admin@test.dev", password: "wrong" });
    expect(bad.status).toBe(401);
  });

  it("returns the current user from /me with a valid token", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    const token = await loginAs("admin@test.dev", "password123");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("admin@test.dev");
  });

  it("rejects requests with no token", async () => {
    const response = await request(app).get("/api/classes");
    expect(response.status).toBe(401);
  });

  it("lets an admin register a new user, but blocks non-admins from registering", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    const adminToken = await loginAs("admin@test.dev", "password123");

    const created = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "teacher@test.dev", password: "password123", fullName: "Teacher", role: "teacher" });
    expect(created.status).toBe(201);

    const teacherToken = await loginAs("teacher@test.dev", "password123");
    const blocked = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ email: "another@test.dev", password: "password123", fullName: "X", role: "teacher" });
    expect(blocked.status).toBe(403);
  });
});

describe("academic hierarchy", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("supports the full Class -> Section -> Student cascade", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    const token = await loginAs("admin@test.dev", "password123");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);

    const createdClass = await auth(request(app).post("/api/classes")).send({ name: "Grade 5", gradeLevel: 5 });
    expect(createdClass.status).toBe(201);

    const createdSection = await auth(
      request(app).post(`/api/classes/${createdClass.body.id}/sections`),
    ).send({ name: "A" });
    expect(createdSection.status).toBe(201);

    const createdStudent = await auth(request(app).post("/api/students")).send({
      sectionId: createdSection.body.id,
      rollNumber: "1",
      fullName: "Test Student",
      dateOfBirth: "2015-01-01",
      gender: "male",
    });
    expect(createdStudent.status).toBe(201);

    const sections = await auth(request(app).get(`/api/classes/${createdClass.body.id}/sections`));
    expect(sections.body).toHaveLength(1);

    const studentsInSection = await auth(request(app).get(`/api/sections/${createdSection.body.id}/students`));
    expect(studentsInSection.body).toHaveLength(1);
    expect(studentsInSection.body[0].fullName).toBe("Test Student");
  });

  it("blocks non-admins from writing but allows them to read", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    await createTestUser("teacher@test.dev", "password123", "teacher");
    const adminToken = await loginAs("admin@test.dev", "password123");
    const teacherToken = await loginAs("teacher@test.dev", "password123");

    const blocked = await request(app)
      .post("/api/classes")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ name: "Grade 6", gradeLevel: 6 });
    expect(blocked.status).toBe(403);

    await request(app)
      .post("/api/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Grade 6", gradeLevel: 6 });

    const allowed = await request(app).get("/api/classes").set("Authorization", `Bearer ${teacherToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toHaveLength(1);
  });
});

describe("health records", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedStudent(token: string) {
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);
    const createdClass = await auth(request(app).post("/api/classes")).send({ name: "Grade 5", gradeLevel: 5 });
    const createdSection = await auth(request(app).post(`/api/classes/${createdClass.body.id}/sections`)).send({
      name: "A",
    });
    const createdStudent = await auth(request(app).post("/api/students")).send({
      sectionId: createdSection.body.id,
      rollNumber: "1",
      fullName: "Test Student",
      dateOfBirth: "2015-01-01",
      gender: "male",
    });
    return createdStudent.body.id as string;
  }

  it("submits a checkup, auto-computes BMI, and lists it in history", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    const token = await loginAs("admin@test.dev", "password123");
    const studentId = await seedStudent(token);

    const submitted = await request(app)
      .post(`/api/students/${studentId}/health-records`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        ageYears: 10,
        heightCm: 140,
        weightKg: 35,
        dentalHygieneStatus: "good",
        hearingStatus: "normal",
        postureStatus: "normal",
        knownAllergies: [],
        chronicConditions: [],
        currentMedications: [],
        avgSleepHours: 8,
        physicalActivityDaysPerWeek: 3,
        dietaryPreference: "vegetarian",
      });

    expect(submitted.status).toBe(201);
    expect(Number(submitted.body.bmi)).toBeCloseTo(35 / (1.4 * 1.4), 1);

    const history = await request(app)
      .get(`/api/students/${studentId}/health-records`)
      .set("Authorization", `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
  });

  it("rejects a submission missing required fields", async () => {
    await createTestUser("admin@test.dev", "password123", "admin");
    const token = await loginAs("admin@test.dev", "password123");
    const studentId = await seedStudent(token);

    const response = await request(app)
      .post(`/api/students/${studentId}/health-records`)
      .set("Authorization", `Bearer ${token}`)
      .send({ heightCm: 140 });

    expect(response.status).toBe(400);
  });
});

afterAll(async () => {
  await pool.end();
});
