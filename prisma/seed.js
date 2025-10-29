const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/auth");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await hashPassword("admin123");
  const admin = await prisma.admin.upsert({
    where: { email: "admin@frental.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@frental.com",
      passwordHash: adminPassword,
    },
  });

  // Create sample landlord
  const landlordPassword = await hashPassword("landlord123");
  const landlord = await prisma.landlord.upsert({
    where: { phoneNumber: "0712345678" },
    update: {},
    create: {
      fullName: "John Doe",
      phoneNumber: "0712345678",
      email: "john@example.com",
      passwordHash: landlordPassword,
    },
  });

  // Create sample property
  const property = await prisma.property.create({
    data: {
      name: "Greenwood Apartments",
      location: "Westlands, Nairobi",
      waterPrice: 500,
      electricityPrice: 1200,
      landlordId: landlord.id,
    },
  });

  // Create sample units
  const units = await Promise.all([
    prisma.unit.create({
      data: {
        name: "Unit A1",
        rent: 15000,
        deposit: 15000,
        size: "850 sq ft",
        bedrooms: 2,
        bathrooms: 1,
        amenities: ["Parking", "Security", "Water"],
        status: "Vacant",
        propertyId: property.id,
      },
    }),
    prisma.unit.create({
      data: {
        name: "Unit A2",
        rent: 12000,
        deposit: 12000,
        size: "750 sq ft",
        bedrooms: 1,
        bathrooms: 1,
        amenities: ["Parking", "Security"],
        status: "Occupied",
        propertyId: property.id,
      },
    }),
    prisma.unit.create({
      data: {
        name: "Unit B1",
        rent: 18000,
        deposit: 18000,
        size: "950 sq ft",
        bedrooms: 3,
        bathrooms: 2,
        amenities: ["Parking", "Security", "Water", "Garden"],
        status: "Vacant",
        propertyId: property.id,
      },
    }),
  ]);

  console.log("✅ Database seeded successfully!");
  console.log(`👤 Admin: ${admin.username} (${admin.email})`);
  console.log(`🏠 Landlord: ${landlord.fullName}`);
  console.log(`🏢 Property: ${property.name}`);
  console.log(`🔑 Units created: ${units.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
