const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('====================================================');
console.log('  Smart Hostel Management System - Database Setup   ');
console.log('====================================================');

const dbUrl = process.env.DATABASE_URL || '';
console.log('Target Database URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));

try {
  console.log('\n[1/3] Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\n[2/3] Synchronizing schema with MySQL database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\n[3/3] Seeding demo roles, hostel rooms, and sample records...');
  execSync('npm run seed', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\n✓ Database initialization completed successfully!');
} catch (error) {
  console.error('\n⚠️  Notice during database setup:');
  console.error(error.message);
  console.log('\nIf your local MySQL root password differs from .env, update server/.env:');
  console.log('DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/smart_hostel_db"');
  console.log('Then run: npm run db:setup');
}
