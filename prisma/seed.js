const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/auth");
const { faker } = require("@faker-js/faker");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin
  const adminPassword = await hashPassword("admin123");
  await prisma.admin.upsert({
    where: { email: "admin@frental.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@frental.com",
      passwordHash: adminPassword,
    },
  });

  // Generate multiple landlords
  const landlords = [];
  for (let i = 0; i < 5; i++) {
    const pwd = await hashPassword("landlord123");
    const landlord = await prisma.landlord.create({
      data: {
        fullName: faker.person.fullName(),
        phoneNumber: faker.phone.number("07########"),
        email: faker.internet.email(),
        passwordHash: pwd,
      },
    });
    landlords.push(landlord);
  }

  // Generate properties + units
  for (const landlord of landlords) {
    for (let i = 0; i < 2; i++) {
      const property = await prisma.property.create({
        data: {
          name: faker.company.name() + " Apartments",
          location: faker.location.city() + ", Nairobi",
          waterPrice: faker.number.int({ min: 300, max: 1000 }),
          electricityPrice: faker.number.int({ min: 800, max: 2500 }),
          landlordId: landlord.id,
        },
      });

      // Create random units for each property
      for (let u = 0; u < 3; u++) {
        await prisma.unit.create({
          data: {
            name: `Unit ${faker.number.int({ min: 1, max: 50 })}`,
            rent: faker.number.int({ min: 8000, max: 40000 }),
            deposit: faker.number.int({ min: 8000, max: 40000 }),
            size: faker.number.int({ min: 500, max: 1200 }) + " sq ft",
            amenities: faker.helpers.arrayElements(
              ["Parking", "Water", "WiFi", "Security", "Gym"],
              3
            ),
            imageUrls: [],
            status: faker.helpers.arrayElement(["Vacant", "Occupied"]),
            propertyId: property.id,
          },
        });
      }
    }
  }

  console.log("✅ Fake data seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
