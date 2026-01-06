import { db } from "./db";
import { colleges } from "@shared/schema";

export async function ensureCollegesExist() {
  console.log("Checking if colleges exist...");
  
  const existingColleges = await db.select().from(colleges);
  
  if (existingColleges.length > 0) {
    console.log(`Found ${existingColleges.length} colleges in database`);
    return;
  }
  
  console.log("No colleges found, seeding required colleges...");
  
  await db
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
    ]);
  
  console.log("Colleges seeded successfully");
}
