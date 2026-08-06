import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate dates relative to now
const getDateOffset = (days, hours = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date;
};

async function main() {
  console.log('🌱 Starting database seeding (Expanded Dataset)...');

  // ─── 1. Roles ─────────────────────────────────────────────────────────────
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
      update: { status: role.status, permissions: role.permissions },
      create: role
    });
    dbRoles[role.name] = createdRole;
  }

  // ─── 2. Users ──────────────────────────────────────────────────────────────
  console.log('Seeding users...');
  const userPass = await bcrypt.hash('Admin@12345', 12);
  const staffPass = await bcrypt.hash('Staff@12345', 12);

  const adminUsers = [
    { name: 'System Administrator', email: 'admin@saiflow.com', role: 'Administrator', dept: 'Management' },
    { name: 'John Miller', email: 'john.miller@saiflow.com', role: 'Administrator', dept: 'Management' }
  ];

  const staffUsers = [
    { name: 'Sarah Jenkins', email: 'bdm@saiflow.com', role: 'Business Development Manager', dept: 'Sales' },
    { name: 'Robert Vance', email: 'robert.v@saiflow.com', role: 'Business Development Manager', dept: 'Sales' },
    { name: 'Alex Rivera', email: 'bde@saiflow.com', role: 'Business Development Executive', dept: 'Sales' },
    { name: 'Emma Watson', email: 'emma.w@saiflow.com', role: 'Business Development Executive', dept: 'Sales' },
    { name: 'Chloe Chen', email: 'chloe.c@saiflow.com', role: 'Business Development Executive', dept: 'Sales' },
    { name: 'David Kim', email: 'presales@saiflow.com', role: 'Presales Consultant', dept: 'Pre-Sales' },
    { name: 'Elena Rostova', email: 'elena.r@saiflow.com', role: 'Presales Consultant', dept: 'Pre-Sales' }
  ];

  const createdUsers = [];
  for (const u of adminUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: userPass, roleId: dbRoles[u.role].id },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: userPass,
        phone: '9876543210',
        department: u.dept,
        roleId: dbRoles[u.role].id,
        status: 'ACTIVE'
      }
    });
    createdUsers.push(user);
  }

  for (const u of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: staffPass, roleId: dbRoles[u.role].id },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: staffPass,
        phone: '9876543200',
        department: u.dept,
        roleId: dbRoles[u.role].id,
        status: 'ACTIVE'
      }
    });
    createdUsers.push(user);
  }

  const bdmDb = createdUsers.find(u => u.email === 'bdm@saiflow.com');
  const bdeDb = createdUsers.find(u => u.email === 'bde@saiflow.com');
  const adminDb = createdUsers.find(u => u.email === 'admin@saiflow.com');

  // ─── 3. Master Data ────────────────────────────────────────────────────────
  console.log('Seeding Master Data items...');

  // Categories
  const categories = {
    LEAD_SOURCE: ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show', 'Partner Referral'],
    PRIORITY: ['Low', 'Medium', 'High', 'Urgent'],
    SERVICE: ['Web Development', 'Mobile Application', 'UI/UX Design', 'DevOps Setup', 'QA Automation', 'Dedicated Support', 'Cyber Security Audit'],
    PAYMENT_TYPE: ['Milestone Based', 'Time and Materials', 'Fixed Cost', 'Monthly Retainer'],
    TECH_STACK: ['React', 'Node.js', 'PostgreSQL', 'Flutter', 'AWS', 'Next.js', 'Python', 'Vue.js', 'Docker', 'Kubernetes']
  };

  const masterCache = {};
  for (const [cat, items] of Object.entries(categories)) {
    masterCache[cat] = [];
    for (const name of items) {
      // Find or create
      let item = await prisma.masterItem.findFirst({ where: { category: cat, name } });
      if (!item) {
        item = await prisma.masterItem.create({ data: { category: cat, name, status: 'Active' } });
      }
      masterCache[cat].push(item);
    }
  }

  // Countries & States
  await prisma.masterItem.createMany({
    data: [
      { category: 'COUNTRY', name: 'India', status: 'Active' },
      { category: 'COUNTRY', name: 'United States', status: 'Active' },
      { category: 'COUNTRY', name: 'United Kingdom', status: 'Active' }
    ],
    skipDuplicates: true
  });

  const countryIndia = await prisma.masterItem.findFirst({ where: { category: 'COUNTRY', name: 'India' } });
  if (countryIndia) {
    await prisma.masterItem.createMany({
      data: [
        { category: 'STATE', name: 'Karnataka', parentId: countryIndia.id, status: 'Active' },
        { category: 'STATE', name: 'Maharashtra', parentId: countryIndia.id, status: 'Active' },
        { category: 'STATE', name: 'Tamil Nadu', parentId: countryIndia.id, status: 'Active' }
      ],
      skipDuplicates: true
    });
  }

  const countryUS = await prisma.masterItem.findFirst({ where: { category: 'COUNTRY', name: 'United States' } });
  if (countryUS) {
    await prisma.masterItem.createMany({
      data: [
        { category: 'STATE', name: 'California', parentId: countryUS.id, status: 'Active' },
        { category: 'STATE', name: 'New York', parentId: countryUS.id, status: 'Active' }
      ],
      skipDuplicates: true
    });
  }

  const sourceWebsite = masterCache.LEAD_SOURCE.find(i => i.name === 'Website');
  const sourceLinkedIn = masterCache.LEAD_SOURCE.find(i => i.name === 'LinkedIn');
  const sourceReferral = masterCache.LEAD_SOURCE.find(i => i.name === 'Referral');
  const priorityHigh = masterCache.PRIORITY.find(i => i.name === 'High');
  const priorityMedium = masterCache.PRIORITY.find(i => i.name === 'Medium');

  // ─── 4. Companies ──────────────────────────────────────────────────────────
  console.log('Seeding Companies...');
  const companyData = [
    { name: 'Acme Corporation', website: 'https://acme.com', email: 'contact@acme.com', phone: '1234567890', address: '100 Acme Way, Silicon Valley', type: 'Enterprise' },
    { name: 'Stark Industries', website: 'https://stark.com', email: 'pepper@stark.com', phone: '9876543210', address: 'Stark Tower, New York City', type: 'Enterprise' },
    { name: 'Globex Corp', website: 'https://globex.com', email: 'hank@globex.com', phone: '5551234567', address: '456 Globex Boulevard, Seattle', type: 'Enterprise' },
    { name: 'Initech Software', website: 'https://initech.com', email: 'peter@initech.com', phone: '5553216540', address: '4120 Freemont St, Austin', type: 'Mid-Market' },
    { name: 'Wayne Enterprises', website: 'https://wayne.com', email: 'lucius@wayne.com', phone: '5559876543', address: 'Wayne Tower, Gotham City', type: 'Enterprise' },
    { name: 'Umbrella Pharma', website: 'https://umbrella.com', email: 'albert@umbrella.com', phone: '5557778888', address: '1 Racoon St, Chicago', type: 'Enterprise' },
    { name: 'Hooli Tech', website: 'https://hooli.com', email: 'gavin@hooli.com', phone: '5558882222', address: '1 Hooli Way, Palo Alto', type: 'Enterprise' },
    { name: 'Soylent Foods', website: 'https://soylent.com', email: 'sol@soylent.com', phone: '5553334444', address: '12 Green Way, Los Angeles', type: 'Mid-Market' },
    { name: 'Tyrell Nexus', website: 'https://tyrell.com', email: 'eldon@tyrell.com', phone: '5559990000', address: '1 Pyramid Way, Los Angeles', type: 'Enterprise' },
    { name: 'Stripe Payments', website: 'https://stripe.com', email: 'collison@stripe.com', phone: '5558881234', address: '510 Townsend St, San Francisco', type: 'Enterprise' }
  ];

  const dbCompanies = [];
  for (const c of companyData) {
    const comp = await prisma.company.create({
      data: {
        name: c.name,
        website: c.website,
        email: c.email,
        phone: c.phone,
        address: c.address,
        companyType: c.type
      }
    });
    dbCompanies.push(comp);
  }

  // ─── 5. Leads (Past & Present) ─────────────────────────────────────────────
  console.log('Seeding Leads...');
  const leadData = [
    // Past Leads (Completed/WON/LOST)
    { title: 'Acme E-Commerce Redesign', contact: 'John Smith', email: 'john@acme.com', status: 'PROPOSAL', daysAgo: 180, assignedTo: bdeDb.id },
    { title: 'Stark Industries AI Platform', contact: 'Pepper Potts', email: 'pepper@stark.com', status: 'WON', daysAgo: 320, assignedTo: bdmDb.id },
    { title: 'Globex Mobile Portal', contact: 'Hank Scorpio', email: 'hank@globex.com', status: 'WON', daysAgo: 240, assignedTo: bdeDb.id },
    { title: 'Initech Legacy Migration', contact: 'Peter Gibbons', email: 'peter@initech.com', status: 'WON', daysAgo: 150, assignedTo: bdeDb.id },
    { title: 'Wayne Enterprises Cyber-Security', contact: 'Lucius Fox', email: 'lucius@wayne.com', status: 'NEW', daysAgo: 5, assignedTo: null },
    { title: 'Umbrella Lab Tracking System', contact: 'Albert Wesker', email: 'albert@umbrella.com', status: 'LOST', daysAgo: 90, assignedTo: bdeDb.id },
    { title: 'Hooli Nucleus Platform', contact: 'Gavin Belson', email: 'gavin@hooli.com', status: 'NEGOTIATION', daysAgo: 45, assignedTo: bdmDb.id },
    { title: 'Soylent E-Commerce Store', contact: 'Sol Roth', email: 'sol@soylent.com', status: 'CONTACTED', daysAgo: 30, assignedTo: bdeDb.id },
    { title: 'Tyrell Replicant Scheduler', contact: 'Eldon Tyrell', email: 'eldon@tyrell.com', status: 'DISQUALIFIED', daysAgo: 120, assignedTo: bdeDb.id },
    { title: 'Stripe Subscription Module', contact: 'Patrick Collison', email: 'collison@stripe.com', status: 'WON', daysAgo: 280, assignedTo: bdmDb.id },

    // Present Leads (Active Pipeline)
    { title: 'Stripe Analytics Dashboard', contact: 'John Collison', email: 'john.c@stripe.com', status: 'NEW', daysAgo: 2, assignedTo: bdeDb.id },
    { title: 'Acme Logistics Tracking Phase 2', contact: 'John Smith', email: 'john@acme.com', status: 'MEETING_SCHEDULED', daysAgo: 8, assignedTo: bdeDb.id },
    { title: 'Hooli Video Compression App', contact: 'Richard Hendricks', email: 'richard@hooli.com', status: 'ASSIGNED', daysAgo: 12, assignedTo: bdeDb.id },
    { title: 'Wayne Secure Communication Dev', contact: 'Bruce Wayne', email: 'bruce@wayne.com', status: 'NEGOTIATION', daysAgo: 15, assignedTo: bdmDb.id },
    { title: 'Globex Payroll Ledger API', contact: 'Hank Scorpio', email: 'hank@globex.com', status: 'PROPOSAL', daysAgo: 20, assignedTo: bdeDb.id }
  ];

  const dbLeads = [];
  for (const l of leadData) {
    const lead = await prisma.lead.create({
      data: {
        title: l.title,
        contactPerson: l.contact,
        email: l.email,
        phone: '555-888-9999',
        designation: 'Director of Technology',
        website: 'https://sample.com',
        companyType: 'Enterprise',
        address: '123 Enterprise Dr',
        sourceId: sourceWebsite?.id,
        priorityId: priorityHigh?.id,
        assignedToId: l.assignedTo,
        status: l.status,
        requirements: `Requirements cataloged on day -${l.daysAgo}. Need robust backend APIs and responsive web/mobile portal integrations.`,
        createdAt: getDateOffset(-l.daysAgo)
      }
    });
    dbLeads.push(lead);
  }

  // ─── 6. Meetings (Past & Present) ──────────────────────────────────────────
  console.log('Seeding Meetings...');
  const meetingData = [
    // Historical Meetings
    { lead: 'Acme E-Commerce Redesign', title: 'Introductory alignment call', daysOffset: -175, status: 'COMPLETED' },
    { lead: 'Stark Industries AI Platform', title: 'J.A.R.V.I.S Security Scope', daysOffset: -315, status: 'COMPLETED' },
    { lead: 'Globex Mobile Portal', title: 'Pipeline Dashboard Kickoff', daysOffset: -235, status: 'COMPLETED' },
    { lead: 'Initech Legacy Migration', title: 'Y2K Fix & Modernization Scope', daysOffset: -145, status: 'COMPLETED' },
    { lead: 'Umbrella Lab Tracking System', title: 'Virus inventory management system audit', daysOffset: -85, status: 'COMPLETED' },
    { lead: 'Hooli Nucleus Platform', title: 'Nucleus integration discussion', daysOffset: -40, status: 'COMPLETED' },
    { lead: 'Stripe Subscription Module', title: 'Stripe billing dashboard alignment', daysOffset: -275, status: 'COMPLETED' },

    // Present / Scheduled Meetings
    { lead: 'Acme Logistics Tracking Phase 2', title: 'Acme Phase 2 scope review', daysOffset: 1, status: 'SCHEDULED' },
    { lead: 'Wayne Secure Communication Dev', title: 'Gotham encryption standards audit', daysOffset: 3, status: 'SCHEDULED' }
  ];

  for (const m of meetingData) {
    const lead = dbLeads.find(l => l.title === m.lead);
    if (lead) {
      await prisma.meeting.create({
        data: {
          leadId: lead.id,
          title: m.title,
          scheduledAt: getDateOffset(m.daysOffset, 2),
          durationMinutes: 45,
          meetingLink: `https://meet.saiflow.com/${lead.id}`,
          status: m.status,
          agenda: 'Review requirements and finalize scope document.',
          createdById: bdmDb.id
        }
      });
    }
  }

  // ─── 7. Clients (Converted Past WON Leads) ──────────────────────────────────
  console.log('Seeding Clients...');
  const clientLeads = dbLeads.filter(l => l.status === 'WON');
  const dbClients = [];
  for (const cl of clientLeads) {
    const comp = dbCompanies.find(c => cl.title.includes(c.name)) || dbCompanies[0];
    const client = await prisma.client.create({
      data: {
        companyId: comp.id,
        leadId: cl.id,
        gstPan: `29AAACD${cl.id}00A1Z0`,
        panNumber: `BCDF${cl.id}00A`,
        status: 'Active',
        paymentTerms: 'Net 30',
        creditLimit: 300000.00,
        relationshipManagerId: bdmDb.id,
        accountManagerId: adminDb.id
      }
    });
    dbClients.push({ ...client, companyName: comp.name });
  }

  // ─── 8. Projects (Past & Present) ──────────────────────────────────────────
  console.log('Seeding Projects...');
  // Stark (delivered), Globex (active), Initech (active), Stripe (delivered)
  const projectList = [
    { client: 'Stark Industries', name: 'J.A.R.V.I.S Monitoring Module', status: 'Delivered', startOffset: -300, endOffset: -200 },
    { client: 'Globex Corp', name: 'Pipeline Mobile Dashboard', status: 'In-Progress', startOffset: -220, endOffset: 60 },
    { client: 'Initech Software', name: 'Legacy COBOL API Modernization', status: 'In-Progress', startOffset: -130, endOffset: 90 },
    { client: 'Stripe Payments', name: 'Stripe Enterprise Invoice Module', status: 'Delivered', startOffset: -260, endOffset: -180 },
    { client: 'Globex Corp', name: 'Phase 2 Payment Gateway Integration', status: 'Kickoff', startOffset: -10, endOffset: 120 }
  ];

  for (const p of projectList) {
    const client = dbClients.find(c => c.companyName === p.client);
    if (client) {
      await prisma.project.create({
        data: {
          clientId: client.id,
          name: p.name,
          pmId: adminDb.id,
          status: p.status,
          kickoffDate: getDateOffset(p.startOffset),
          targetDate: getDateOffset(p.endOffset),
          notes: `Project ${p.name} configured with start offset ${p.startOffset} days.`
        }
      });
    }
  }

  // ─── 9. Proposals (Past & Present) ─────────────────────────────────────────
  console.log('Seeding Proposals...');
  const proposalData = [
    // Historical Proposals
    { leadTitle: 'Acme E-Commerce Redesign', number: 'BP-2025-101', title: 'Next.js storefront design & dev', amount: 15000, status: 'Accepted', daysAgo: 170 },
    { leadTitle: 'Stark Industries AI Platform', number: 'BP-2025-102', title: 'Secure private database deployment', amount: 75000, status: 'Accepted', daysAgo: 310 },
    { leadTitle: 'Globex Mobile Portal', number: 'BP-2025-103', title: 'Pipeline visualization apps', amount: 22000, status: 'Accepted', daysAgo: 230 },
    { leadTitle: 'Initech Legacy Migration', number: 'BP-2025-104', title: 'COBOL to Spring Boot architecture', amount: 18500, status: 'Accepted', daysAgo: 140 },
    { leadTitle: 'Umbrella Lab Tracking System', number: 'BP-2025-105', title: 'Lab inventory tracking schema', amount: 9500, status: 'Rejected', daysAgo: 80 },
    { leadTitle: 'Tyrell Replicant Scheduler', number: 'BP-2025-106', title: 'Nexus-6 cognitive load estimator', amount: 110000, status: 'Rejected', daysAgo: 110 },
    { leadTitle: 'Stripe Subscription Module', number: 'BP-2025-107', title: 'Custom stripe customer billing portal', amount: 28000, status: 'Accepted', daysAgo: 270 },

    // Present Proposals
    { leadTitle: 'Hooli Nucleus Platform', number: 'BP-2026-201', title: 'Core infrastructure setup', amount: 55000, status: 'Sent', daysAgo: 30 },
    { leadTitle: 'Wayne Secure Communication Dev', number: 'BP-2026-202', title: 'Secure messaging service', amount: 48000, status: 'Sent', daysAgo: 10 },
    { leadTitle: 'Stripe Analytics Dashboard', number: 'BP-2026-203', title: 'Stripe analytics integration', amount: 62000, status: 'Draft', daysAgo: 1 }
  ];

  for (const prop of proposalData) {
    const lead = dbLeads.find(l => l.title === prop.leadTitle);
    if (lead) {
      await prisma.proposal.create({
        data: {
          leadId: lead.id,
          proposalNumber: prop.number,
          title: prop.title,
          amount: prop.amount,
          status: prop.status,
          createdById: bdmDb.id,
          createdAt: getDateOffset(-prop.daysAgo),
          pricing: { subtotal: prop.amount, discountPercent: 0, discountAmount: 0, taxPercent: 18, taxAmount: prop.amount * 0.18, grandTotal: prop.amount * 1.18 },
          estimation: {
            items: [
              { id: 'li-1', category: 'Web Development', description: 'Core feature architecture', unit: 'Project', unitPrice: prop.amount, quantity: 1, amount: prop.amount }
            ],
            subtotal: prop.amount,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 18,
            taxAmount: prop.amount * 0.18,
            total: prop.amount * 1.18
          },
          quotation: { paymentTerms: 'Net 30', validityDays: 30, deliveryTimeline: '90 Days', warrantyPeriod: '6 Months', notes: 'Standard proposal terms apply.' }
        }
      });
    }
  }

  // Returning Client Proposals (New feature additions linked DIRECTLY to Clients, not Leads!)
  const globexClient = dbClients.find(c => c.companyName === 'Globex Corp');
  if (globexClient) {
    await prisma.proposal.create({
      data: {
        clientId: globexClient.id,
        proposalNumber: 'BP-2026-CLIENT-01',
        title: 'Phase 2 Payment Integration add-on',
        amount: 4000.00,
        status: 'Accepted',
        createdById: bdmDb.id,
        createdAt: getDateOffset(-12),
        pricing: { subtotal: 4000.00, discountPercent: 0, discountAmount: 0, taxPercent: 18, taxAmount: 720.00, grandTotal: 4720.00 },
        estimation: {
          items: [
            { id: 'li-client-1', category: 'Web Development', description: 'Stripe webhook payment capture logic', unit: 'Project', unitPrice: 4000, quantity: 1, amount: 4000 }
          ],
          subtotal: 4000.00,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 18,
          taxAmount: 720.00,
          total: 4720.00
        },
        quotation: { paymentTerms: 'Net 15', validityDays: 15, deliveryTimeline: '3 Weeks', warrantyPeriod: '3 Months', notes: 'Change Request add-on for project phase 2.' }
      }
    });
  }

  const starkClient = dbClients.find(c => c.companyName === 'Stark Industries');
  if (starkClient) {
    await prisma.proposal.create({
      data: {
        clientId: starkClient.id,
        proposalNumber: 'BP-2026-CLIENT-02',
        title: 'J.A.R.V.I.S API endpoint extensions (CR-04)',
        amount: 8500.00,
        status: 'Sent',
        createdById: bdmDb.id,
        createdAt: getDateOffset(-2),
        pricing: { subtotal: 8500.00, discountPercent: 5, discountAmount: 425.00, taxPercent: 18, taxAmount: 1453.50, grandTotal: 9528.50 },
        estimation: {
          items: [
            { id: 'li-client-2', category: 'Web Development', description: 'Extend rest endpoints and add swagger schemas', unit: 'Project', unitPrice: 8500, quantity: 1, amount: 8500 }
          ],
          subtotal: 8500.00,
          discountPercent: 5,
          discountAmount: 425.00,
          taxPercent: 18,
          taxAmount: 1453.50,
          total: 9528.50
        },
        quotation: { paymentTerms: 'Net 30', validityDays: 30, deliveryTimeline: '2 Weeks', warrantyPeriod: '1 Year', notes: 'Additional endpoint expansion requested by Pepper.' }
      }
    });
  }

  // ─── 10. Seed System Settings ──────────────────────────────────────────────
  console.log('Seeding system settings...');
  const defaultSettings = [
    { key: 'appName', category: 'GENERAL', value: 'Clienzo Lead Management' },
    { key: 'timeZone', category: 'GENERAL', value: 'GMT+05:30' },
    { key: 'language', category: 'GENERAL', value: 'English (US)' },
    { key: 'companyName', category: 'Sai Technologies' },
    { key: 'contactEmail', category: 'COMPANY', value: 'info@saiflow.com' },
    { key: 'address', category: 'COMPANY', value: '12, Tech Park Avenue, Bangalore, India' }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, category: setting.category || 'GENERAL' },
      create: { key: setting.key, category: setting.category || 'GENERAL', value: setting.value }
    });
  }

  // ─── 11. Seed Connect / Timeline Logs ──────────────────────────────────────
  console.log('Seeding Connect / Timeline logs...');
  const outcomes = ['CONTACTED', 'INTERESTED', 'CALL_LATER', 'NOT_INTERESTED'];
  for (let i = 0; i < dbLeads.length; i++) {
    const lead = dbLeads[i];
    await prisma.connect.create({
      data: {
        leadId: lead.id,
        company: lead.title,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        assignedTo: 'Alex Rivera',
        outcome: outcomes[i % outcomes.length],
        summary: `Spoke with ${lead.contactPerson}. Discussed high-level requirements and budget.`,
        followUpType: 'Call',
        followUpDate: '2026-08-10',
        followUpTime: '15:00',
        status: 'COMPLETED',
        createdById: bdeDb.id
      }
    });
  }

  // ─── 12. Seed Notifications ────────────────────────────────────────────────
  console.log('Seeding notifications...');
  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      { userName: 'Sarah Jenkins', message: 'marked lead status as WON for', targetName: 'Stark Industries AI Platform', category: 'Lead' },
      { userName: 'Alex Rivera', message: 'scheduled a presales meeting with', targetName: 'Wayne Enterprises Cyber-Security', category: 'Meeting' },
      { userName: 'Alex Rivera', message: 'created a new proposal', targetName: 'Prototyping headless Next.js Storefront', category: 'Proposal' },
      { userName: 'Sarah Jenkins', message: 'submitted Client-Direct Proposal', targetName: 'BP-2026-CLIENT-02 (Stark Industries)', category: 'Proposal' },
      { userName: 'System Auto', message: 'synced active status for client', targetName: 'Globex Corp', category: 'System' }
    ]
  });

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
