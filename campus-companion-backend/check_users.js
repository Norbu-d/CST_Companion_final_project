const prisma = require('./src/db');

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  users.forEach(u => {
    console.log(`${u.studentId} - ${u.name} - ${u.role}`);
  });
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
