/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  // Idempotent baseline student + categories + courses.
  const instructorEmail = "instructor@aimlocal.dev";
  const instructor = await prisma.user.upsert({
    where: { email: instructorEmail },
    update: {},
    create: {
      email: instructorEmail,
      passwordHash: "seed_password_hash",
      firstName: "AIM",
      lastName: "Instructor",
      role: "instructor",
      isActive: true,
      emailVerified: true,
    },
  });

  const data = [
    {
      master: "Cloud",
      sub: "AWS",
      course: "AWS Foundation",
      short: "Learn core AWS services from scratch.",
      price: "0.00",
    },
    {
      master: "Data",
      sub: "Data Engineering",
      course: "Data Engineering Bootcamp",
      short: "ETL pipelines, warehousing, and orchestration.",
      price: "199.00",
    },
    {
      master: "AI",
      sub: "Machine Learning",
      course: "Applied Machine Learning",
      short: "Build and deploy production ML models.",
      price: "249.00",
    },
  ];

  for (const row of data) {
    const master = await prisma.masterCategory.upsert({
      where: { name: row.master },
      update: {},
      create: { name: row.master, reviews: 0 },
    });

    const sub = await prisma.subCategory.findFirst({
      where: { name: row.sub, masterCategoryId: master.id },
    });

    const ensuredSub =
      sub ??
      (await prisma.subCategory.create({
        data: { name: row.sub, masterCategoryId: master.id },
      }));

    const existingCourse = await prisma.course.findFirst({
      where: { title: row.course, subcategoryId: ensuredSub.id },
    });
    if (!existingCourse) {
      await prisma.course.create({
        data: {
          title: row.course,
          description: row.short,
          shortDescription: row.short,
          subcategoryId: ensuredSub.id,
          instructorId: instructor.id,
          price: row.price,
          currency: "USD",
          durationHours: 24,
          difficultyLevel: "beginner",
          thumbnail: "",
          status: "published",
          maxStudents: 1000,
          prerequisites: "Basic computer literacy",
          learningOutcomes: "Understand fundamentals and apply hands-on skills",
          isActive: true,
          modeOfConduct: "online",
        },
      });
    }
  }

  console.log("Seed completed successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

