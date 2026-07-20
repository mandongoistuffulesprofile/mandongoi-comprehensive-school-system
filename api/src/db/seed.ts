import 'dotenv/config';
import { config } from '../config';
import { validateConfig } from '../config';
import { db } from '../db';
import { hashPassword } from '../utils/auth';
import {
  users,
  staff,
  students,
  guardians,

  feeStructures,
  feeInvoices,
  ledgerAccounts,
  foodPresets,
  smsTemplates,
  paybills,
  attendanceStudent,
} from '../models/schema';
import { eq, and } from 'drizzle-orm';

validateConfig();

async function main() {
  const adminEmail = 'admin@school.edu';
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await hashPassword('Admin@1234');
    const [admin] = await db
      .insert(users)
      .values({
        name: 'School Administrator',
        email: adminEmail,
        phone: '+254700000000',
        passwordHash,
        role: 'schoolAdmin',
        mustResetPassword: true,
      })
      .returning();
    console.log(`Created admin user: ${admin.email}`);
  } else {
    console.log('Admin user already exists, skipping');
  }

  const teacherEmail = 'teacher@school.edu';
  const [existingTeacher] = await db
    .select()
    .from(users)
    .where(eq(users.email, teacherEmail))
    .limit(1);
  if (!existingTeacher) {
    const passwordHash = await hashPassword('Teacher@1234');
    await db.insert(users).values({
      name: 'Sample Teacher',
      email: teacherEmail,
      phone: '+254700000001',
      passwordHash,
      role: 'teacher',
    });
    console.log('Created teacher user');
  }

  const accountantEmail = 'accountant@school.edu';
  const [existingAccountant] = await db
    .select()
    .from(users)
    .where(eq(users.email, accountantEmail))
    .limit(1);
  if (!existingAccountant) {
    const passwordHash = await hashPassword('Accountant@1234');
    await db.insert(users).values({
      name: 'Sample Accountant',
      email: accountantEmail,
      phone: '+254700000002',
      passwordHash,
      role: 'accountant',
    });
    console.log('Created accountant user');
  }

  const [existingStaff] = await db.select().from(staff).where(eq(staff.email, 'teacher@school.edu')).limit(1);
  if (!existingStaff) {
    await db.insert(staff).values({
      name: 'Sample Teacher',
      phone: '+254700000001',
      email: 'teacher@school.edu',
      role: 'teacher',
      employmentType: 'flatRate',
      baseRate: '30000.00',
      isActive: true,
    });
    console.log('Created staff member');
  }

  const [existingStudent] = await db
    .select()
    .from(students)
    .where(eq(students.firstName, 'Jane'))
    .limit(1);
  let studentId = existingStudent?.id;
  if (!existingStudent) {
    const [student] = await db
      .insert(students)
      .values({
        firstName: 'Jane',
        lastName: 'Wanjiku',
        dateOfBirth: new Date('2016-05-12'),
        gender: 'female',
        level: 'comprehensive',
        grade: 'Grade 1',
        class: 'A',
        enrollmentDate: new Date('2024-01-15'),
        studentType: 'day',
        foodProgramType: 'none',
        status: 'active',
      })
      .returning();
    studentId = student.id;
    console.log('Created sample student');
  }

  if (studentId) {
    const [existingGuardian] = await db
      .select()
      .from(guardians)
      .where(eq(guardians.studentId, studentId))
      .limit(1);
    if (!existingGuardian) {
      await db.insert(guardians).values({
        studentId,
        name: 'Mary Wanjiku',
        phone: '+254711111111',
        relationship: 'mother',
        isPrimary: true,
        preferredLanguage: 'en',
        smsOptOut: false,
      });
      console.log('Created guardian');
    }
  }

  // ── Fee Structures for Grade 1 ──
  async function seedFS(grade: string, studentType: 'day' | 'boarding' | 'both', amounts: {
    tuitionAmount?: string; activityAmount?: string; adminLevyAmount?: string;
    boardingAmount?: string; foodAmount?: string;
  }) {
    const total = (
      Number(amounts.tuitionAmount || 0) + Number(amounts.activityAmount || 0) +
      Number(amounts.adminLevyAmount || 0) + Number(amounts.boardingAmount || 0) +
      Number(amounts.foodAmount || 0)
    ).toFixed(2);
    const [existing] = await db
      .select()
      .from(feeStructures)
      .where(and(eq(feeStructures.grade, grade), eq(feeStructures.studentType, studentType)))
      .limit(1);
    if (existing) return existing.id;
    const [fs] = await db.insert(feeStructures).values({
      grade, term: 1, academicYear: 2026, studentType,
      tuitionAmount: amounts.tuitionAmount || '0',
      activityAmount: amounts.activityAmount || '0',
      adminLevyAmount: amounts.adminLevyAmount || '0',
      boardingAmount: amounts.boardingAmount || '0',
      foodAmount: amounts.foodAmount || '0',
      totalAmount: total,
    }).returning();
    return fs.id;
  }

  const [existingGrade1] = await db
    .select()
    .from(feeStructures)
    .where(and(eq(feeStructures.grade, 'Grade 1'), eq(feeStructures.studentType, 'both')))
    .limit(1);
  let structureId = existingGrade1?.id;
  if (!structureId) {
    structureId = await seedFS('Grade 1', 'both', { tuitionAmount: '25000.00' });
    console.log('Created Grade 1 fee structure');
  }

  const [existingGrade1Board] = await db
    .select()
    .from(feeStructures)
    .where(and(eq(feeStructures.grade, 'Grade 1'), eq(feeStructures.studentType, 'boarding')))
    .limit(1);
  if (!existingGrade1Board) {
    await seedFS('Grade 1', 'boarding', { tuitionAmount: '25000.00', boardingAmount: '18000.00', foodAmount: '12000.00', adminLevyAmount: '1500.00' });
    console.log('Created boarding fee structure');
  }

  if (studentId && structureId) {
    const [existingInvoice] = await db
      .select()
      .from(feeInvoices)
      .where(eq(feeInvoices.studentId, studentId))
      .limit(1);
    if (!existingInvoice) {
      await db.insert(feeInvoices).values({
        studentId,
        feeStructureId: structureId,
        term: 1,
        academicYear: 2026,
        totalAmount: '25000.00',
        amountPaid: '0',
        balance: '25000.00',
      });
      console.log('Created sample invoice');
    }
  }

  const ledgerSeed = [
    { code: '1000', name: 'Cash', type: 'asset' as const },
    { code: '2000', name: 'Tuition Income', type: 'income' as const },
    { code: '3000', name: 'Salaries Expense', type: 'expense' as const },
    { code: '4000', name: 'M-Pesa Float', type: 'asset' as const },
    { code: '5000', name: 'Food Inventory', type: 'asset' as const },
    { code: '6000', name: 'Food Income', type: 'income' as const },
    { code: '7000', name: 'Food Expense', type: 'expense' as const },
  ];
  for (const account of ledgerSeed) {
    const [existing] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.code, account.code)).limit(1);
    if (!existing) {
      await db.insert(ledgerAccounts).values(account);
      console.log(`Created ledger account ${account.code} - ${account.name}`);
    }
  }

  // ── Food Presets ──
  const foodPresetSeed = [
    { itemName: 'Maize Flour', unitPrice: '150.00', unit: 'kg', stockQuantity: '200', reorderLevel: '50' },
    { itemName: 'Rice', unitPrice: '200.00', unit: 'kg', stockQuantity: '150', reorderLevel: '30' },
    { itemName: 'Beans', unitPrice: '180.00', unit: 'kg', stockQuantity: '100', reorderLevel: '25' },
    { itemName: 'Cooking Oil', unitPrice: '350.00', unit: 'l', stockQuantity: '40', reorderLevel: '10' },
    { itemName: 'Sugar', unitPrice: '220.00', unit: 'kg', stockQuantity: '60', reorderLevel: '15' },
  ];
  for (const preset of foodPresetSeed) {
    const [existing] = await db.select().from(foodPresets).where(eq(foodPresets.itemName, preset.itemName)).limit(1);
    if (!existing) {
      await db.insert(foodPresets).values(preset);
      console.log(`Created food preset: ${preset.itemName}`);
    } else if (Number(existing.stockQuantity) === 0) {
      await db.update(foodPresets).set({
        stockQuantity: preset.stockQuantity,
        reorderLevel: preset.reorderLevel,
      }).where(eq(foodPresets.id, existing.id));
      console.log(`Updated stock for food preset: ${preset.itemName}`);
    }
  }

  const defaultTemplates = [
    {
      name: 'Fee Reminder',
      type: 'feeReminder' as const,
      content: 'Dear {guardianName}, school fees for {studentName} ({term}) are due. Balance: KES {balance}. Due date: {dueDate}. Please pay to avoid disruption.',
      variables: ['guardianName', 'studentName', 'term', 'balance', 'dueDate'],
      language: 'en' as const,
      isDefault: true,
    },
    {
      name: 'Term Dates Notification',
      type: 'meeting' as const,
      content: 'Dear {guardianName}, {schoolName} {term} {academicYear} runs from {termStartDate} to {termEndDate}. Next term starts {nextTermStartDate}. Please prepare your child {studentName} accordingly.',
      variables: ['guardianName', 'schoolName', 'term', 'academicYear', 'termStartDate', 'termEndDate', 'nextTermStartDate', 'studentName'],
      language: 'en' as const,
      isDefault: true,
    },
    {
      name: 'Results Published',
      type: 'results' as const,
      content: 'Dear {guardianName}, results for {studentName} ({term} {academicYear}) have been published. Please check the school portal or visit the school to collect the report card.',
      variables: ['guardianName', 'studentName', 'term', 'academicYear'],
      language: 'en' as const,
      isDefault: true,
    },
    {
      name: 'Fee Receipt Confirmation',
      type: 'receipt' as const,
      content: 'Dear {guardianName}, we have received KES {amountPaid} fee payment for {studentName} ({term}). Total paid: KES {totalAmount}. Balance: KES {balance}. Thank you.',
      variables: ['guardianName', 'studentName', 'term', 'amountPaid', 'totalAmount', 'balance'],
      language: 'en' as const,
      isDefault: true,
    },
    {
      name: 'Attendance Alert',
      type: 'attendance' as const,
      content: 'Dear {guardianName}, your child {studentName} was marked absent on {dueDate}. Please ensure regular attendance. Contact the school if there is an issue.',
      variables: ['guardianName', 'studentName', 'dueDate'],
      language: 'en' as const,
      isDefault: true,
    },
  ];

  for (const tmpl of defaultTemplates) {
    const [existing] = await db.select().from(smsTemplates).where(eq(smsTemplates.type, tmpl.type as any)).limit(1);
    if (!existing) {
      await db.insert(smsTemplates).values(tmpl);
      console.log(`Created SMS template: ${tmpl.name}`);
    }
  }

  const [existingPaybill] = await db.select().from(paybills).where(eq(paybills.shortcode, '174379')).limit(1);
  if (!existingPaybill) {
    await db.insert(paybills).values({
      name: 'Default School Paybill',
      shortcode: '174379',
      accountReferenceFormat: '{firstname}{lastname}-{grade}',
      purpose: 'tuition',
      darajaConsumerKeyRef: 'ref:mpesa_consumer_key',
      darajaConsumerSecretRef: 'ref:mpesa_consumer_secret',
      darajaPasskeyRef: 'ref:mpesa_passkey',
      isActive: true,
    });
    console.log('Created default paybill');
  }

  // ── Additional Staff ──
  const [existingTeacher2] = await db.select().from(staff).where(eq(staff.email, 'jane.muthoni@school.edu')).limit(1);
  if (!existingTeacher2) {
    await db.insert(staff).values({
      name: 'Jane Muthoni',
      phone: '+254722111222',
      email: 'jane.muthoni@school.edu',
      role: 'teacher',
      employmentType: 'flatRate',
      baseRate: '35000.00',
      isActive: true,
    });
    console.log('Created staff member: Jane Muthoni');
  }

  const [existingSupport] = await db.select().from(staff).where(eq(staff.email, 'peter.kamau@school.edu')).limit(1);
  if (!existingSupport) {
    await db.insert(staff).values({
      name: 'Peter Kamau',
      phone: '+254733222333',
      email: 'peter.kamau@school.edu',
      role: 'support',
      employmentType: 'flatRate',
      baseRate: '25000.00',
      isActive: true,
    });
    console.log('Created staff member: Peter Kamau');
  }

  const [existingSessionStaff] = await db.select().from(staff).where(eq(staff.email, 'sarah.wanjala@school.edu')).limit(1);
  if (!existingSessionStaff) {
    await db.insert(staff).values({
      name: 'Sarah Wanjala',
      phone: '+254744333444',
      email: 'sarah.wanjala@school.edu',
      role: 'teacher',
      employmentType: 'sessionBased',
      baseRate: '500.00',
      isActive: true,
    });
    console.log('Created staff member: Sarah Wanjala');
  }

  // ── New Students (Comprehensive School: boarding + day) ──
  const newStudents = [
    { firstName: 'Brian', lastName: 'Kimani',   dateOfBirth: new Date('2016-08-20'), gender: 'male',   level: 'comprehensive' as const, grade: 'Grade 1', class: 'A', enrollmentDate: new Date('2024-01-15'), studentType: 'day' as const, foodProgramType: 'none' as const, status: 'active' as const },
    { firstName: 'Cynthia', lastName: 'Akinyi',  dateOfBirth: new Date('2015-03-10'), gender: 'female', level: 'comprehensive' as const, grade: 'Grade 2', class: 'B', enrollmentDate: new Date('2024-01-15'), studentType: 'boarding' as const, boardingHouse: 'Lions', foodProgramType: 'pay_fee' as const, status: 'active' as const },
    { firstName: 'David', lastName: 'Mwangi',   dateOfBirth: new Date('2014-11-05'), gender: 'male',   level: 'comprehensive' as const, grade: 'Grade 3', class: 'A', enrollmentDate: new Date('2024-01-15'), studentType: 'day' as const, foodProgramType: 'none' as const, status: 'active' as const },
    { firstName: 'Esther', lastName: 'Wambui',  dateOfBirth: new Date('2013-07-18'), gender: 'female', level: 'comprehensive' as const, grade: 'Grade 4', class: 'C', enrollmentDate: new Date('2024-01-15'), studentType: 'boarding' as const, boardingHouse: 'Dolphin', foodProgramType: 'bring_own' as const, status: 'active' as const },
    { firstName: 'Francis', lastName: 'Otieno',  dateOfBirth: new Date('2012-09-22'), gender: 'male',   level: 'comprehensive' as const, grade: 'Grade 5', class: 'B', enrollmentDate: new Date('2024-01-15'), studentType: 'day' as const, foodProgramType: 'none' as const, status: 'active' as const },
    { firstName: 'Grace', lastName: 'Njoki',    dateOfBirth: new Date('2011-02-14'), gender: 'female', level: 'comprehensive' as const, grade: 'Grade 6', class: 'A', enrollmentDate: new Date('2024-01-15'), studentType: 'boarding' as const, boardingHouse: 'Dolphin', foodProgramType: 'pay_fee' as const, status: 'active' as const },
    { firstName: 'Hassan', lastName: 'Ali',     dateOfBirth: new Date('2015-06-30'), gender: 'male',   level: 'comprehensive' as const, grade: 'Grade 2', class: 'C', enrollmentDate: new Date('2024-01-15'), studentType: 'day' as const, foodProgramType: 'none' as const, status: 'active' as const },
    { firstName: 'Irene', lastName: 'Nyambura',  dateOfBirth: new Date('2013-12-01'), gender: 'female', level: 'comprehensive' as const, grade: 'Grade 4', class: 'A', enrollmentDate: new Date('2024-01-15'), studentType: 'boarding' as const, boardingHouse: 'Lions', foodProgramType: 'bring_own' as const, status: 'active' as const },
    { firstName: 'James', lastName: 'Kiprop',   dateOfBirth: new Date('2014-04-16'), gender: 'male',   level: 'comprehensive' as const, grade: 'Grade 3', class: 'B', enrollmentDate: new Date('2024-01-15'), studentType: 'day' as const, foodProgramType: 'none' as const, status: 'transferred' as const },
    { firstName: 'Faith', lastName: 'Wanjiru',  dateOfBirth: new Date('2016-10-08'), gender: 'female', level: 'comprehensive' as const, grade: 'Grade 1', class: 'C', enrollmentDate: new Date('2024-06-01'), studentType: 'boarding' as const, boardingHouse: 'Dolphin', foodProgramType: 'pay_fee' as const, status: 'withdrawn' as const },
  ];

  const studentIdMap: Record<string, string> = {};
  for (const s of newStudents) {
    const key = `${s.firstName}${s.lastName}`;
    const [existing] = await db
      .select()
      .from(students)
      .where(and(eq(students.firstName, s.firstName), eq(students.lastName, s.lastName)))
      .limit(1);
    if (!existing) {
      const [student] = await db.insert(students).values(s).returning();
      studentIdMap[key] = student.id;
      console.log(`Created student ${s.firstName} ${s.lastName}`);
    } else {
      studentIdMap[key] = existing.id;
    }
  }

  // ── Guardians for new students (2 per student) ──
  const guardianDefs: Record<string, Array<{ name: string; phone: string; relationship: string; isPrimary: boolean }>> = {
    BrianKimani: [
      { name: 'Paul Kimani', phone: '+254722100001', relationship: 'father', isPrimary: true },
      { name: 'Lucy Kimani', phone: '+254733100001', relationship: 'mother', isPrimary: false },
    ],
    CynthiaAkinyi: [
      { name: 'John Akinyi', phone: '+254722100002', relationship: 'father', isPrimary: true },
      { name: 'Grace Akinyi', phone: '+254733100002', relationship: 'mother', isPrimary: false },
    ],
    DavidMwangi: [
      { name: 'Samuel Mwangi', phone: '+254722100003', relationship: 'father', isPrimary: true },
      { name: 'Nancy Mwangi', phone: '+254733100003', relationship: 'mother', isPrimary: false },
    ],
    EstherWambui: [
      { name: 'Peter Wambui', phone: '+254722100004', relationship: 'father', isPrimary: true },
      { name: 'Ann Wambui', phone: '+254733100004', relationship: 'mother', isPrimary: false },
    ],
    FrancisOtieno: [
      { name: 'George Otieno', phone: '+254722100005', relationship: 'father', isPrimary: true },
      { name: 'Rose Otieno', phone: '+254733100005', relationship: 'mother', isPrimary: false },
    ],
    GraceNjoki: [
      { name: 'Michael Njoki', phone: '+254722100006', relationship: 'father', isPrimary: true },
      { name: 'Esther Njoki', phone: '+254733100006', relationship: 'mother', isPrimary: false },
    ],
    HassanAli: [
      { name: 'Mohamed Ali', phone: '+254722100007', relationship: 'father', isPrimary: true },
      { name: 'Amina Ali', phone: '+254733100007', relationship: 'mother', isPrimary: false },
    ],
    IreneNyambura: [
      { name: 'Patrick Nyambura', phone: '+254722100008', relationship: 'father', isPrimary: true },
      { name: 'Monica Nyambura', phone: '+254733100008', relationship: 'mother', isPrimary: false },
    ],
    JamesKiprop: [
      { name: 'Thomas Kiprop', phone: '+254722100009', relationship: 'father', isPrimary: true },
      { name: 'Diana Kiprop', phone: '+254733100009', relationship: 'mother', isPrimary: false },
    ],
    FaithWanjiru: [
      { name: 'David Wanjiru', phone: '+254722100010', relationship: 'father', isPrimary: true },
      { name: 'Sarah Wanjiru', phone: '+254733100010', relationship: 'mother', isPrimary: false },
    ],
  };

  for (const [studentKey, guardiansList] of Object.entries(guardianDefs)) {
    const sId = studentIdMap[studentKey];
    if (!sId) continue;
    const [existingG] = await db
      .select()
      .from(guardians)
      .where(eq(guardians.studentId, sId))
      .limit(1);
    if (!existingG) {
      for (const g of guardiansList) {
        await db.insert(guardians).values({
          studentId: sId,
          name: g.name,
          phone: g.phone,
          relationship: g.relationship,
          isPrimary: g.isPrimary,
          preferredLanguage: 'en',
          smsOptOut: false,
        });
      }
      console.log(`Created guardians for ${studentKey}`);
    }
  }

  // ── Fee Structures for Grade 2 – Grade 9 (Day + Boarding) ──
  async function seedFeeStructuresForGrade(grade: string, amounts: {
    tuitionAmount: string; activityAmount?: string; adminLevyAmount?: string;
    boardingAmount?: string; foodAmount?: string;
  }, studentType: 'day' | 'boarding') {
    const [existing] = await db
      .select()
      .from(feeStructures)
      .where(and(eq(feeStructures.grade, grade), eq(feeStructures.studentType, studentType)))
      .limit(1);
    if (existing) return existing.id;
    const total = (
      Number(amounts.tuitionAmount) + Number(amounts.activityAmount || 0) +
      Number(amounts.adminLevyAmount || 0) + Number(amounts.boardingAmount || 0) +
      Number(amounts.foodAmount || 0)
    ).toFixed(2);
    const [fs] = await db
      .insert(feeStructures)
      .values({
        grade, term: 1, academicYear: 2026, studentType,
        tuitionAmount: amounts.tuitionAmount,
        activityAmount: amounts.activityAmount || '0',
        adminLevyAmount: amounts.adminLevyAmount || '0',
        boardingAmount: amounts.boardingAmount || '0',
        foodAmount: amounts.foodAmount || '0',
        totalAmount: total,
      })
      .returning();
    return fs.id;
  }

  const dayFeeData: Record<string, { tuition: string; activity?: string; adminLevy?: string }> = {
    'Grade 2': { tuition: '22000.00' },
    'Grade 3': { tuition: '24000.00' },
    'Grade 4': { tuition: '26000.00', activity: '2000.00' },
    'Grade 5': { tuition: '28000.00', activity: '2000.00' },
    'Grade 6': { tuition: '30000.00', activity: '2000.00' },
    'Grade 7': { tuition: '35000.00', activity: '2500.00', adminLevy: '1500.00' },
    'Grade 8': { tuition: '35000.00', activity: '2500.00', adminLevy: '1500.00' },
    'Grade 9': { tuition: '38000.00', activity: '2500.00', adminLevy: '2000.00' },
  };

  const boardingFeeData: Record<string, { tuition: string; activity?: string; adminLevy?: string; boarding: string; food: string }> = {
    'Grade 2': { tuition: '22000.00', boarding: '16000.00', food: '10000.00', adminLevy: '1500.00' },
    'Grade 3': { tuition: '24000.00', boarding: '16000.00', food: '10000.00', adminLevy: '1500.00' },
    'Grade 4': { tuition: '26000.00', activity: '2000.00', boarding: '18000.00', food: '12000.00', adminLevy: '1500.00' },
    'Grade 5': { tuition: '28000.00', activity: '2000.00', boarding: '18000.00', food: '12000.00', adminLevy: '1500.00' },
    'Grade 6': { tuition: '30000.00', activity: '2000.00', boarding: '20000.00', food: '12000.00', adminLevy: '1500.00' },
    'Grade 7': { tuition: '35000.00', activity: '2500.00', boarding: '20000.00', food: '14000.00', adminLevy: '2000.00' },
    'Grade 8': { tuition: '35000.00', activity: '2500.00', boarding: '20000.00', food: '14000.00', adminLevy: '2000.00' },
    'Grade 9': { tuition: '38000.00', activity: '2500.00', boarding: '22000.00', food: '14000.00', adminLevy: '2000.00' },
  };

  const feeStructureIdByGrade: Record<string, string> = {};
  for (const grade of Object.keys(dayFeeData)) {
    const d = dayFeeData[grade];
    const id = await seedFeeStructuresForGrade(grade, {
      tuitionAmount: d.tuition, activityAmount: d.activity, adminLevyAmount: d.adminLevy,
    }, 'day');
    feeStructureIdByGrade[grade] = id;
    console.log(`Created day fee structure for ${grade}`);
  }
  for (const grade of Object.keys(boardingFeeData)) {
    const d = boardingFeeData[grade];
    await seedFeeStructuresForGrade(grade, {
      tuitionAmount: d.tuition, activityAmount: d.activity, adminLevyAmount: d.adminLevy,
      boardingAmount: d.boarding, foodAmount: d.food,
    }, 'boarding');
    console.log(`Created boarding fee structure for ${grade}`);
  }

  // Grab Grade 1 fee structure ID (seeded above)
  const [fs1Lookup] = await db
    .select()
    .from(feeStructures)
    .where(eq(feeStructures.grade, 'Grade 1'))
    .limit(1);
  if (fs1Lookup) {
    feeStructureIdByGrade['Grade 1'] = fs1Lookup.id;
  }

  // ── Invoices for new students ──
  for (const s of newStudents) {
    const key = `${s.firstName}${s.lastName}`;
    const sId = studentIdMap[key];
    if (!sId) continue;
    const fsId = feeStructureIdByGrade[s.grade];
    if (!fsId) continue;
    const [existingInv] = await db
      .select()
      .from(feeInvoices)
      .where(eq(feeInvoices.studentId, sId))
      .limit(1);
    if (!existingInv) {
      const [fs] = await db.select().from(feeStructures).where(eq(feeStructures.id, fsId)).limit(1);
      let total = Number(fs.totalAmount);
      if (s.studentType === 'boarding' && s.foodProgramType === 'bring_own') {
        total -= Number(fs.foodAmount);
      }
      await db.insert(feeInvoices).values({
        studentId: sId,
        feeStructureId: fsId,
        term: 1,
        academicYear: 2026,
        totalAmount: String(total),
        amountPaid: '0',
        balance: String(total),
      });
      console.log(`Created invoice for ${s.firstName} ${s.lastName}`);
    }
  }

  // ── Student Attendance Records ──
  const [teacherUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'teacher@school.edu'))
    .limit(1);

  if (teacherUser) {
    const activeStudents = newStudents.filter((s) => s.status === 'active');
    const dates = [
      new Date('2026-01-13'),
      new Date('2026-01-14'),
      new Date('2026-01-15'),
      new Date('2026-01-16'),
      new Date('2026-01-20'),
    ];
    for (const s of activeStudents) {
    const key = `${s.firstName}${s.lastName}`;
    const sId = studentIdMap[key];
    if (!sId) continue;
    for (const date of dates) {
        const [existingAtt] = await db
          .select()
          .from(attendanceStudent)
          .where(and(eq(attendanceStudent.studentId, sId), eq(attendanceStudent.date, date)))
          .limit(1);
        if (!existingAtt) {
          const status = date.getTime() === dates[3].getTime() ? 'late' : 'present';
          await db.insert(attendanceStudent).values({
            studentId: sId,
            date,
            status,
            markedBy: teacherUser.id,
          });
        }
      }
    }
    console.log('Created attendance records for active students');
  }

  console.log('Seed complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
