import { db } from "./db";
import { colleges, users, courses, lessons } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const existingColleges = await db.select().from(colleges);
  if (existingColleges.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  const [pharmacyCollege, engineeringCollege, itCollege] = await db
    .insert(colleges)
    .values([
      {
        name: "College of Pharmacy",
        slug: "pharmacy",
        themeName: "Pharmacy Theme",
        primaryColor: "#10b981",
        secondaryColor: "#059669",
      },
      {
        name: "College of Engineering",
        slug: "engineering",
        themeName: "Engineering Theme",
        primaryColor: "#3b82f6",
        secondaryColor: "#2563eb",
      },
      {
        name: "College of IT",
        slug: "it",
        themeName: "IT Theme",
        primaryColor: "#8b5cf6",
        secondaryColor: "#7c3aed",
      },
    ])
    .returning();

  console.log("Created colleges:", pharmacyCollege.name, engineeringCollege.name, itCollege.name);

  const [teacher1, teacher2, teacher3] = await db
    .insert(users)
    .values([
      {
        id: "demo-teacher-1",
        email: "teacher1@pharmacy.edu",
        firstName: "Dr. Sarah",
        lastName: "Johnson",
        role: "TEACHER",
        collegeId: pharmacyCollege.id,
      },
      {
        id: "demo-teacher-2",
        email: "teacher2@engineering.edu",
        firstName: "Prof. Michael",
        lastName: "Chen",
        role: "TEACHER",
        collegeId: engineeringCollege.id,
      },
      {
        id: "demo-teacher-3",
        email: "teacher3@it.edu",
        firstName: "Dr. Emily",
        lastName: "Williams",
        role: "TEACHER",
        collegeId: itCollege.id,
      },
    ])
    .returning();

  console.log("Created demo teachers");

  const [pharmacyCourse1] = await db
    .insert(courses)
    .values([
      {
        collegeId: pharmacyCollege.id,
        teacherId: "demo-teacher-1",
        title: "Introduction to Pharmacology",
        description: "Learn the fundamentals of how drugs affect the human body, including drug absorption, distribution, metabolism, and excretion.",
        status: "PUBLISHED",
      },
      {
        collegeId: pharmacyCollege.id,
        teacherId: "demo-teacher-1",
        title: "Clinical Pharmacy Practice",
        description: "Advanced course covering patient care, medication therapy management, and pharmaceutical care principles.",
        status: "PUBLISHED",
      },
      {
        collegeId: engineeringCollege.id,
        teacherId: "demo-teacher-2",
        title: "Structural Engineering Basics",
        description: "Introduction to structural analysis and design principles for civil engineers.",
        status: "PUBLISHED",
      },
      {
        collegeId: engineeringCollege.id,
        teacherId: "demo-teacher-2",
        title: "Thermodynamics",
        description: "Study of energy, heat, and work relationships in mechanical systems.",
        status: "PUBLISHED",
      },
      {
        collegeId: itCollege.id,
        teacherId: "demo-teacher-3",
        title: "Web Development Fundamentals",
        description: "Learn HTML, CSS, and JavaScript to build modern web applications.",
        status: "PUBLISHED",
      },
      {
        collegeId: itCollege.id,
        teacherId: "demo-teacher-3",
        title: "Database Design",
        description: "Master relational database concepts, SQL, and database optimization techniques.",
        status: "PUBLISHED",
      },
    ])
    .returning();

  console.log("Created sample courses");

  const coursesData = await db.select().from(courses);
  for (const course of coursesData) {
    await db.insert(lessons).values([
      {
        courseId: course.id,
        title: "Introduction & Overview",
        contentType: "text",
        content: "Welcome to this course! In this introductory lesson, we will cover the syllabus, learning objectives, and what you can expect from this course.",
        orderIndex: 0,
      },
      {
        courseId: course.id,
        title: "Core Concepts",
        contentType: "video",
        content: "https://example.com/video/core-concepts",
        orderIndex: 1,
      },
      {
        courseId: course.id,
        title: "Practical Application",
        contentType: "text",
        content: "Now that you understand the core concepts, let's apply them to real-world scenarios and problems.",
        orderIndex: 2,
      },
      {
        courseId: course.id,
        title: "Additional Resources",
        contentType: "link",
        content: "https://example.com/resources",
        orderIndex: 3,
      },
    ]);
  }

  console.log("Created sample lessons for all courses");
  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
