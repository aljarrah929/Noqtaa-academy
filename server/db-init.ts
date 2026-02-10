import { db } from "./db";
import { universities, colleges, majors } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function ensureUniversitiesAndCollegesExist() {
  console.log("Checking if universities exist...");

  const existingUniversities = await db.select().from(universities);

  if (existingUniversities.length > 0) {
    console.log(`Found ${existingUniversities.length} universities in database`);
    return;
  }

  console.log("No universities found, seeding universities, colleges, and majors...");

  const [just, uj] = await db
    .insert(universities)
    .values([
      {
        name: "Jordan University of Science and Technology",
        slug: "just",
      },
      {
        name: "University of Jordan",
        slug: "uj",
      },
    ])
    .returning();

  console.log("Created universities:", just.name, uj.name);

  const existingColleges = await db.select().from(colleges);

  if (existingColleges.length > 0) {
    console.log(`Found ${existingColleges.length} existing colleges, assigning to ${just.name}...`);
    for (const college of existingColleges) {
      await db.update(colleges).set({ universityId: just.id }).where(eq(colleges.id, college.id));
    }
    console.log("Assigned existing colleges to JUST");
  } else {
    await db
      .insert(colleges)
      .values([
        {
          name: "College of Pharmacy",
          slug: "pharmacy",
          universityId: just.id,
          themeName: "Pharmacy Theme",
          primaryColor: "#10b981",
          secondaryColor: "#059669",
        },
        {
          name: "College of Engineering",
          slug: "engineering",
          universityId: just.id,
          themeName: "Engineering Theme",
          primaryColor: "#3b82f6",
          secondaryColor: "#2563eb",
        },
        {
          name: "College of IT",
          slug: "it",
          universityId: just.id,
          themeName: "IT Theme",
          primaryColor: "#8b5cf6",
          secondaryColor: "#7c3aed",
        },
      ]);
    console.log("Created colleges for JUST");
  }

  await db
    .insert(colleges)
    .values([
      {
        name: "Faculty of Pharmacy",
        slug: "uj-pharmacy",
        universityId: uj.id,
        themeName: "Pharmacy Theme",
        primaryColor: "#10b981",
        secondaryColor: "#059669",
      },
      {
        name: "Faculty of Engineering",
        slug: "uj-engineering",
        universityId: uj.id,
        themeName: "Engineering Theme",
        primaryColor: "#3b82f6",
        secondaryColor: "#2563eb",
      },
    ]);
  console.log("Created colleges for University of Jordan");

  const allColleges = await db.select().from(colleges);

  for (const college of allColleges) {
    const collegeMajors = getMajorsForCollege(college.slug);
    if (collegeMajors.length > 0) {
      await db.insert(majors).values(
        collegeMajors.map((m) => ({
          name: m.name,
          slug: m.slug,
          collegeId: college.id,
        }))
      );
    }
  }

  console.log("Seeded majors for all colleges");
  console.log("University/College/Major seeding complete!");
}

function getMajorsForCollege(collegeSlug: string): { name: string; slug: string }[] {
  const majorMap: Record<string, { name: string; slug: string }[]> = {
    pharmacy: [
      { name: "Doctor of Pharmacy (Pharm.D)", slug: "pharmd" },
      { name: "Clinical Pharmacy", slug: "clinical-pharmacy" },
    ],
    "uj-pharmacy": [
      { name: "Pharmaceutical Sciences", slug: "pharma-sciences" },
      { name: "Clinical Pharmacy", slug: "uj-clinical-pharmacy" },
    ],
    engineering: [
      { name: "Civil Engineering", slug: "civil" },
      { name: "Mechanical Engineering", slug: "mechanical" },
      { name: "Electrical Engineering", slug: "electrical" },
    ],
    "uj-engineering": [
      { name: "Civil Engineering", slug: "uj-civil" },
      { name: "Computer Engineering", slug: "uj-computer-eng" },
    ],
    it: [
      { name: "Computer Science", slug: "cs" },
      { name: "Software Engineering", slug: "se" },
      { name: "Information Systems", slug: "is" },
    ],
  };

  return majorMap[collegeSlug] || [
    { name: "General Studies", slug: `${collegeSlug}-general` },
  ];
}
