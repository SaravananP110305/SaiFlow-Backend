import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles
  console.log('Seeding roles...');
  const roles = [
    {
      name: 'Administrator',
      status: 'Active',
      permissions: {
        users: ['view', 'create', 'edit', 'delete'],
        roles: ['view', 'create', 'edit', 'delete'],
        leads: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
        meetings: ['view', 'create', 'edit', 'delete'],
        proposals: ['view', 'create', 'edit', 'delete', 'approve'],
        clients: ['view', 'create', 'edit', 'delete', 'approve'],
        companies: ['view', 'create', 'edit', 'delete'],
        reports: ['view'],
        connect: ['view', 'create', 'edit', 'delete'],
        settings: ['view', 'edit'],
        notifications: ['view']
      }
    },
    {
      name: 'Business Development Manager',
      status: 'Active',
      permissions: {
        users: ['view'],
        roles: ['view'],
        leads: ['view', 'create', 'edit', 'export', 'assign'],
        meetings: ['view', 'create', 'edit'],
        proposals: ['view', 'create', 'edit', 'approve'],
        clients: ['view', 'create', 'edit', 'approve'],
        companies: ['view', 'create', 'edit', 'delete'],
        reports: ['view'],
        connect: ['view', 'create', 'edit'],
        settings: ['view'],
        notifications: ['view']
      }
    },
    {
      name: 'Business Development Executive',
      status: 'Active',
      permissions: {
        users: [],
        roles: [],
        leads: ['view', 'create', 'edit'],
        meetings: ['view', 'create', 'edit'],
        proposals: ['view', 'create', 'edit'],
        clients: ['view'],
        companies: ['view', 'create', 'edit'],
        reports: [],
        connect: ['view', 'create', 'edit'],
        settings: ['view'],
        notifications: ['view']
      }
    },
    {
      name: 'Presales Consultant',
      status: 'Active',
      permissions: {
        users: [],
        roles: [],
        leads: ['view'],
        meetings: ['view'],
        proposals: ['view', 'create', 'edit'],
        clients: ['view'],
        companies: ['view'],
        reports: [],
        connect: ['view'],
        settings: ['view'],
        notifications: ['view']
      }
    }
  ];

  const dbRoles = {};
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        status: role.status,
        permissions: role.permissions
      },
      create: role
    });
    dbRoles[role.name] = createdRole;
    console.log(`Role [${role.name}] seeded.`);
  }

  // 2. Seed Admin User
  console.log('Seeding default administrator...');
  const adminEmail = 'admin@saiflow.com';
  const hashedPassword = await bcrypt.hash('Admin@12345', 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      roleId: dbRoles['Administrator'].id,
      status: 'ACTIVE'
    },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: hashedPassword,
      phone: '9876543210',
      roleId: dbRoles['Administrator'].id,
      status: 'ACTIVE'
    }
  });
  console.log(`Default administrator (${adminEmail}) seeded.`);

  // 3. Seed Master Data
  console.log('Seeding Master Data items...');

  // Lead Sources
  const leadSources = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show'];
  for (const name of leadSources) {
    await prisma.masterItem.createMany({
      data: [{ category: 'LEAD_SOURCE', name, status: 'Active' }],
      skipDuplicates: true
    });
  }
  console.log('Lead sources seeded.');

  // Priorities
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  for (const name of priorities) {
    await prisma.masterItem.createMany({
      data: [{ category: 'PRIORITY', name, status: 'Active' }],
      skipDuplicates: true
    });
  }
  console.log('Priorities seeded.');

  // Countries
  const countries = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia'];
  for (const name of countries) {
    await prisma.masterItem.createMany({
      data: [{ category: 'COUNTRY', name, status: 'Active' }],
      skipDuplicates: true
    });
  }
  console.log('Countries seeded.');

  // States (linking to Country parent if exists)
  const india = await prisma.masterItem.findFirst({ where: { category: 'COUNTRY', name: 'India' } });
  if (india) {
    const states = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Delhi'];
    for (const name of states) {
      await prisma.masterItem.createMany({
        data: [{ category: 'STATE', name, parentId: india.id, status: 'Active' }],
        skipDuplicates: true
      });
    }
    console.log('States for India seeded.');
  }

  const us = await prisma.masterItem.findFirst({ where: { category: 'COUNTRY', name: 'United States' } });
  if (us) {
    const states = ['California', 'New York', 'Texas', 'Washington', 'Illinois'];
    for (const name of states) {
      await prisma.masterItem.createMany({
        data: [{ category: 'STATE', name, parentId: us.id, status: 'Active' }],
        skipDuplicates: true
      });
    }
    console.log('States for USA seeded.');
  }

  // 4. Seed System Settings
  console.log('Seeding system settings...');
  const defaultSettings = [
    { key: 'appName', category: 'GENERAL', value: 'SaiFlow ERP' },
    { key: 'timeZone', category: 'GENERAL', value: 'GMT+05:30' },
    { key: 'language', category: 'GENERAL', value: 'English (US)' },
    { key: 'companyName', category: 'COMPANY', value: 'Sai Technologies' },
    { key: 'contactEmail', category: 'COMPANY', value: 'info@saiflow.com' },
    { key: 'address', category: 'COMPANY', value: '12, Tech Park Avenue, Bangalore, India' }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        category: setting.category
      },
      create: setting
    });
  }
  console.log('System settings seeded.');

  // 5. Seed Sample Notifications
  console.log('Seeding notifications...');
  const existingNotifications = await prisma.notification.count();
  if (existingNotifications === 0) {
    const sourceUser = await prisma.user.findFirst({ where: { email: adminEmail } });
    const sourceName = sourceUser?.name || 'System Administrator';

    const wonLead = await prisma.lead.findFirst({
      where: { status: 'WON', deletedAt: null },
      select: { title: true }
    });
    const scheduledMeeting = await prisma.meeting.findFirst({
      where: { status: 'SCHEDULED' },
      include: { lead: { select: { title: true } } }
    });
    const followUpConnect = await prisma.connect.findFirst({
      where: { status: 'SCHEDULED', deletedAt: null },
      select: { company: true }
    });
    const assignedLead = await prisma.lead.findFirst({
      where: { assignedToId: { not: null }, deletedAt: null },
      select: { title: true }
    });

    const defaultNotifications = [
      {
        userName: sourceName,
        message: 'marked lead status as WON for',
        targetName: wonLead?.title || 'Google',
        category: 'Lead'
      },
      {
        userName: sourceName,
        message: 'scheduled a presales meeting with',
        targetName: scheduledMeeting?.lead.title || 'Salesforce CRM',
        category: 'Meeting'
      },
      {
        userName: sourceName,
        message: 'logged a successful follow-up with',
        targetName: followUpConnect?.company || 'Stripe Payment',
        category: 'Follow-up'
      },
      {
        userName: 'System Auto',
        message: 'imported new qualified leads from',
        targetName: 'Leads_Q3_Upload.xlsx',
        category: 'System'
      },
      {
        userName: sourceName,
        message: 'assigned a new lead to',
        targetName: assignedLead?.title || 'Netflix Stream',
        category: 'Lead'
      }
    ];

    await prisma.notification.createMany({
      data: defaultNotifications
    });
    console.log('Notifications seeded.');
  } else {
    console.log('Notifications already exist; skipping seed.');
  }

  console.log('🏁 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
