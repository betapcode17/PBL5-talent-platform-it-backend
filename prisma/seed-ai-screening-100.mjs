import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CANDIDATE_COUNT = 100;
const JOB_TITLE = 'Associate Sales Development Representative - Korean Market';
const JOB_REQUIREMENTS = [
  'Tối thiểu 1 năm kinh nghiệm Sales B2B hoặc vai trò liên quan.',
  'Trình độ Cao đẳng trở lên.',
  'Tiếng Anh giao tiếp cơ bản.',
  'Tiếng Hàn thành thạo, ưu tiên TOPIK 5 hoặc TOPIK 6.',
  'Có thành tích đạt chỉ tiêu doanh số cá nhân hoặc đội nhóm.',
  'Có kinh nghiệm gọi điện với số lượng lớn.',
  'Có khả năng học công nghệ và làm việc với dữ liệu.',
  'Có kỹ năng giải quyết vấn đề.',
  'Sử dụng tốt các chương trình MS Office.',
];
const JOB_DESCRIPTION = `
TÓM TẮT
As an Associate Sales Development Representative, you’ll learn how to open doors and create opportunities. You’ll gain hands-on experience reaching out to potential customers, responding to inbound interest, and qualifying leads for our sales teams.

This role is fast-paced and activity-driven. You’ll make calls, send emails, and leverage social channels daily to build connections. With coaching and support, you’ll learn how to craft compelling messages, ask discovery questions, and move prospects to the next stage of the sales cycle. Along the way, you’ll develop valuable skills in sales technology, market research, and AI-powered prospecting tools.

Product: CyberSecurity
Hiring Type: Full-time, Onsite

DUTIES AND RESPONSIBILITIES
- Identify, contact, and engage prospective customers through email outreach, outbound phone calls, and scheduled Zoom/virtual discovery meetings.
- Conduct structured discovery calls to understand customer needs, business goals, challenges, and overall solution fit.
- Qualify leads based on predefined criteria and clearly categorize them as Qualified or Not Qualified.
- Capture and document all discovery insights, qualification details, and next steps accurately in the CRM system.
- Provide prospects with high-level product and use-case information without engaging in pricing, negotiation, or deal closure.
- Schedule and hand over Sales Qualified Leads (SQLs) to the sales closure team with complete and clear context.
- Maintain a clean and up-to-date lead pipeline through consistent follow-ups and status updates.
- Track lead activity and qualification metrics using CRM tools and contribute to regular reporting.
`.trim();
const JOB_BENEFITS = [
  'Có hỗ trợ Data.',
  'Nghỉ thứ 7 và Chủ nhật.',
  '2 tháng thử việc hưởng 100% lương.',
  'Tham gia đầy đủ các chế độ bảo hiểm theo Luật Lao động, đóng BHXH trên full lương cơ bản.',
  'Bảo hiểm tai nạn 24/7.',
  '14 ngày phép/năm.',
  'Lương tháng 13.',
  'Khám sức khỏe định kỳ hàng năm.',
  'Quà lễ/Tết.',
].join('\n');
const JOB_LOCATION = [
  'Hồ Chí Minh: OfficeHaus, OFH Buildings, Tan Son Nhi Ward, Phường Tân Sơn Nhì (quận Tân Phú cũ)',
  'Hà Nội: Phường Đống Đa (quận Đống Đa cũ)',
].join('\n');

const TECHNICAL_JOB_SKILLS = [
  { name: 'B2B Software Sales', mandatory: true, months: 12, priority: 1 },
  { name: 'Online Sales', mandatory: true, months: 12, priority: 2 },
  { name: 'Lead Qualification', mandatory: true, months: 12, priority: 3 },
  { name: 'High-volume Calling', mandatory: true, months: 12, priority: 4 },
  { name: 'CRM', mandatory: true, months: 12, priority: 5 },
  { name: 'Discovery Calls', mandatory: false, months: 6, priority: 6 },
  { name: 'MS Office', mandatory: true, months: 6, priority: 7 },
  { name: 'Market Research', mandatory: false, months: 6, priority: 8 },
  { name: 'AI-powered Prospecting', mandatory: false, months: 6, priority: 9 },
  { name: 'CyberSecurity Product Sales', mandatory: false, months: 6, priority: 10 },
  { name: 'Data-driven Sales', mandatory: false, months: 6, priority: 11 },
];
const SOFT_JOB_SKILLS = [
  { name: 'Communication', mandatory: true, months: 12, priority: 12 },
  { name: 'Problem Solving', mandatory: true, months: 12, priority: 13 },
  { name: 'Goal Orientation', mandatory: false, months: 6, priority: 14 },
  { name: 'Follow-up Discipline', mandatory: false, months: 6, priority: 15 },
  { name: 'Teamwork', mandatory: false, months: 6, priority: 16 },
];
const LANGUAGE_JOB_SKILLS = [
  { name: 'Korean TOPIK 5', mandatory: true, months: 12, priority: 17 },
  { name: 'English Basic Communication', mandatory: true, months: 12, priority: 18 },
];
const FIRST_NAMES = [
  'Minh',
  'Linh',
  'Khoa',
  'Trang',
  'Huy',
  'Hân',
  'Bảo',
  'Vy',
  'Nam',
  'Phương',
  'Quang',
  'Thảo',
  'Đức',
  'Nhi',
  'Tuấn',
  'Mai',
  'Long',
  'An',
  'Sơn',
  'Yến',
];
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
const UNIVERSITIES = [
  'Đại học Ngoại thương',
  'Đại học Kinh tế TP.HCM',
  'Đại học Thương mại',
  'Đại học Kinh tế Quốc dân',
  'Đại học Tài chính - Marketing',
  'Cao đẳng Kinh tế Đối ngoại',
  'Đại học Quốc tế - ĐHQG TP.HCM',
  'Đại học Hà Nội',
];
const COMPANIES = [
  'Korea Tech Solutions',
  'Cloud Business Vietnam',
  'SaaS Growth Hub',
  'Digital Security Asia',
  'B2B Commerce Vietnam',
  'Enterprise Software Center',
];

const now = () => new Date();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const unique = (values) => [...new Set(values)];

function tierFor(index) {
  if (index < 20) return { key: 'excellent', label: 'Excellent match', years: 4, topik: 6 };
  if (index < 45) return { key: 'strong', label: 'Strong match', years: 2, topik: 5 };
  if (index < 70) return { key: 'partial', label: 'Partial match', years: 1.3, topik: 4 };
  if (index < 85) return { key: 'weak', label: 'Weak match', years: 0.7, topik: 3 };
  return { key: 'unrelated', label: 'Unrelated profile', years: 2, topik: 2 };
}

function rotate(values, offset) {
  const normalized = offset % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function buildCandidate(index) {
  const tier = tierFor(index);
  const number = String(index + 1).padStart(3, '0');
  const fullName = `${LAST_NAMES[index % LAST_NAMES.length]} ${FIRST_NAMES[index % FIRST_NAMES.length]} ${number}`;
  const technicalByTier = {
    excellent: TECHNICAL_JOB_SKILLS.map((skill) => skill.name),
    strong: TECHNICAL_JOB_SKILLS.slice(0, 9).map((skill) => skill.name),
    partial: [
      'B2B Software Sales',
      'Online Sales',
      'Lead Qualification',
      'CRM',
      'MS Office',
      'Market Research',
    ],
    weak: ['Online Sales', 'CRM', 'MS Office', 'Customer Service', 'Social Media Sales'],
    unrelated: ['Customer Service', 'Content Marketing', 'MS Office', 'Event Coordination'],
  }[tier.key];
  const softByTier = {
    excellent: SOFT_JOB_SKILLS.map((skill) => skill.name),
    strong: SOFT_JOB_SKILLS.slice(0, 4).map((skill) => skill.name),
    partial: ['Communication', 'Problem Solving', 'Teamwork'],
    weak: ['Communication', 'Teamwork'],
    unrelated: ['Teamwork', 'Time Management'],
  }[tier.key];
  const english =
    tier.key === 'excellent'
      ? 'English Business Communication'
      : tier.key === 'weak' || tier.key === 'unrelated'
        ? 'English Elementary Communication'
        : 'English Basic Communication';
  const korean = `Korean TOPIK ${tier.topik}`;
  const languageSkills = [
    korean,
    ...(tier.topik > 5 ? ['Korean TOPIK 5'] : []),
    english,
  ];
  const skills = unique([...technicalByTier, ...softByTier, ...languageSkills]);
  const months = Math.round(tier.years * 12);
  const startDate = new Date();
  startDate.setUTCMonth(startDate.getUTCMonth() - months);
  const role =
    tier.key === 'excellent'
      ? 'Senior Sales Development Representative'
      : tier.key === 'strong'
        ? 'Sales Development Representative'
        : tier.key === 'partial'
          ? 'B2B Sales Executive'
          : tier.key === 'weak'
            ? 'Online Sales Executive'
            : 'Customer Service Executive';
  const salesContext =
    tier.key === 'unrelated'
      ? 'hỗ trợ khách hàng B2C và điều phối sự kiện, chưa có kinh nghiệm Sales B2B phần mềm'
      : tier.key === 'weak'
        ? 'tư vấn khách hàng B2C qua mạng xã hội, cập nhật CRM cơ bản'
        : `tìm kiếm khách hàng doanh nghiệp, gọi outbound, email outreach, discovery call, lead qualification và cập nhật CRM`;
  const achievement =
    tier.key === 'excellent'
      ? 'Đạt 125% chỉ tiêu SQL và duy trì 80 cuộc gọi/tuần.'
      : tier.key === 'strong'
        ? 'Đạt 105% chỉ tiêu SQL và duy trì 60 cuộc gọi/tuần.'
        : tier.key === 'partial'
          ? 'Đạt 90% chỉ tiêu lead và thực hiện 35 cuộc gọi/tuần.'
          : tier.key === 'weak'
            ? 'Có kinh nghiệm gọi khoảng 15 khách hàng/tuần.'
            : 'Chưa làm việc theo chỉ tiêu Sales B2B.';
  const degree =
    tier.key === 'weak' && index % 2 === 0
      ? 'Trung cấp'
      : tier.key === 'unrelated' && index % 3 === 0
        ? 'Trung học phổ thông'
        : index % 4 === 0
          ? 'Cao đẳng'
          : 'Cử nhân';
  const projectName =
    tier.key === 'unrelated'
      ? `Customer Engagement Campaign ${number}`
      : `Korean Market CyberSecurity Prospecting ${number}`;
  const projectDescription =
    tier.key === 'unrelated'
      ? 'Phối hợp triển khai chiến dịch chăm sóc khách hàng và tổng hợp phản hồi bằng Excel.'
      : `Xây dựng danh sách khách hàng doanh nghiệp Hàn Quốc, nghiên cứu nhu cầu CyberSecurity, thực hiện outreach đa kênh, qualification và bàn giao SQL cho đội closing. ${achievement}`;
  const languageDescription = `Tiếng Hàn TOPIK ${tier.topik}; ${english}; có thể trao đổi với khách hàng ở mức phù hợp hồ sơ.`;

  return {
    expectedTier: tier.label,
    email: `ai.loadtest.${number}@itjobvn.local`,
    fullName,
    phone: `0902${String(100000 + index).slice(-6)}`,
    linkedin: `https://linkedin.com/in/sales-loadtest-${number}`,
    portfolio: `https://candidate-${number}.example.com/sales-portfolio`,
    skills,
    softSkills: softByTier,
    skillMonths: Object.fromEntries(
      skills.map((skill, skillIndex) => [
        skill,
        Math.max(3, months - skillIndex * 2 + (index % 5)),
      ]),
    ),
    experience: {
      company: COMPANIES[index % COMPANIES.length],
      position: role,
      startDate,
      description: `${salesContext}. ${achievement} Sử dụng MS Office, CRM và dữ liệu để theo dõi pipeline. ${languageDescription}`,
    },
    education: {
      school: UNIVERSITIES[index % UNIVERSITIES.length],
      degree,
      major: index % 3 === 0 ? 'Ngôn ngữ Hàn Quốc' : 'Kinh doanh quốc tế',
    },
    certificates: [
      {
        title: `Korean Language TOPIK ${tier.topik}`,
        type: 'Language',
        issuer: 'National Institute for International Education',
        score: `TOPIK ${tier.topik}`,
      },
      {
        title: english,
        type: 'Language',
        issuer: 'Internal Language Assessment',
        score: english,
      },
    ],
    project: {
      name: projectName,
      role,
      description: projectDescription,
      technologies: technicalByTier.join(', '),
      link: `https://candidate-${number}.example.com/projects/sales`,
    },
    coverLetter: `[Expected screening tier: ${tier.label}] Tôi ứng tuyển vị trí SDR thị trường Hàn Quốc. ${languageDescription} ${achievement}`,
    summary: {
      about: `${role} có ${tier.years} năm kinh nghiệm. ${languageDescription}`,
      strengths: `${softByTier.join(', ')}. ${achievement}`,
      objective: 'Phát triển chuyên sâu Sales B2B phần mềm và giải pháp CyberSecurity cho thị trường Hàn Quốc.',
    },
  };
}

async function ensureSkill(name, skillType) {
  return prisma.skill.upsert({
    where: { skill_name: name },
    create: { skill_name: name, skill_type: skillType, updated_date: now() },
    update: { skill_type: skillType, updated_date: now() },
  });
}

async function ensureJob() {
  const employee = await prisma.employee.findFirst({
    include: { Company: true },
    orderBy: { employee_id: 'asc' },
  });
  if (!employee) throw new Error('Không tìm thấy Employee để đăng tin tuyển dụng.');

  let category = await prisma.category.findFirst({
    where: { name: { contains: 'Sales', mode: 'insensitive' } },
    orderBy: { category_id: 'asc' },
  });
  category ??= await prisma.category.create({
    data: { name: 'Sales & Business Development', is_active: true },
  });

  let jobType = await prisma.jobType.findFirst({
    where: { job_type: { contains: 'Full', mode: 'insensitive' } },
    orderBy: { job_type_id: 'asc' },
  });
  jobType ??= await prisma.jobType.create({
    data: { job_type: 'Full-time', description: 'Full-time employment', is_active: true },
  });

  const existing = await prisma.jobPost.findFirst({
    where: { company_id: employee.company_id, job_title: JOB_TITLE },
    orderBy: { job_post_id: 'asc' },
  });
  const data = {
    employee_id: employee.employee_id,
    company_id: employee.company_id,
    category_id: category.category_id,
    job_type_id: jobType.job_type_id,
    name: JOB_TITLE,
    job_title: JOB_TITLE,
    job_description: JOB_DESCRIPTION,
    candidate_requirements: JOB_REQUIREMENTS.join('\n'),
    benefits: JOB_BENEFITS,
    work_location: JOB_LOCATION,
    work_time: 'Thứ 2 - Thứ 6, 09:00 - 18:00',
    work_type: 'ONSITE',
    level: 'Associate',
    experience: 'Tối thiểu 1 năm kinh nghiệm Sales B2B hoặc vai trò liên quan',
    education: 'Cao đẳng trở lên',
    salary: '40000000-45000000 VND; Lương cứng 35000000-40000000 VND, không phụ thuộc doanh số',
    number_of_hires: 5,
    deadline: new Date('2026-12-31T23:59:59.000Z'),
    is_active: true,
    updated_date: now(),
  };

  const job = existing
    ? await prisma.jobPost.update({ where: { job_post_id: existing.job_post_id }, data })
    : await prisma.jobPost.create({ data });

  await prisma.jobPostSkill.deleteMany({ where: { job_post_id: job.job_post_id } });
  for (const [skillType, definitions] of [
    ['TECHNICAL', TECHNICAL_JOB_SKILLS],
    ['SOFT', SOFT_JOB_SKILLS],
    ['LANGUAGE', LANGUAGE_JOB_SKILLS],
  ]) {
    for (const definition of definitions) {
      const skill = await ensureSkill(definition.name, skillType);
      await prisma.jobPostSkill.create({
        data: {
          job_post_id: job.job_post_id,
          skill_id: skill.skill_id,
          required_level: definition.mandatory ? 'Required' : 'Preferred',
          min_experience_months: definition.months,
          is_mandatory: definition.mandatory,
          priority: definition.priority,
        },
      });
    }
  }
  await prisma.jobAiCriteriaCache.deleteMany({ where: { jobPostId: job.job_post_id } });
  return { job, employee, category, jobType };
}

async function resetCandidateCv(seekerId) {
  await prisma.cvSkill.deleteMany({ where: { userId: seekerId } });
  await prisma.cvExperience.deleteMany({ where: { userId: seekerId } });
  await prisma.cvEducation.deleteMany({ where: { userId: seekerId } });
  await prisma.cvCertificate.deleteMany({ where: { userId: seekerId } });
  await prisma.cvProject.deleteMany({ where: { userId: seekerId } });
  await prisma.cvPersonality.deleteMany({ where: { userId: seekerId } });
}

async function seedCandidate(candidate, jobId, index) {
  const user = await prisma.user.upsert({
    where: { email: candidate.email },
    create: {
      email: candidate.email,
      password: '$2b$10$aiScreeningLoadTestPasswordHash',
      phone: candidate.phone,
      role: 'SEEKER',
      is_active: true,
      full_name: candidate.fullName,
    },
    update: {
      phone: candidate.phone,
      role: 'SEEKER',
      is_active: true,
      full_name: candidate.fullName,
    },
  });
  const cvUrl = `https://example.com/cv/sales-${candidate.email}.pdf`;
  await prisma.seeker.upsert({
    where: { seeker_id: user.user_id },
    create: {
      seeker_id: user.user_id,
      file_cv: cvUrl,
      linkedin_url: candidate.linkedin,
      portfolio_url: candidate.portfolio,
      updated_date: now(),
    },
    update: {
      file_cv: cvUrl,
      github_url: null,
      linkedin_url: candidate.linkedin,
      portfolio_url: candidate.portfolio,
      updated_date: now(),
    },
  });
  await resetCandidateCv(user.user_id);

  for (const skillName of candidate.skills) {
    const type = skillName.startsWith('Korean') || skillName.startsWith('English')
      ? 'LANGUAGE'
      : candidate.softSkills.includes(skillName)
        ? 'SOFT'
        : 'TECHNICAL';
    await ensureSkill(skillName, type);
    await prisma.cvSkill.create({
      data: {
        userId: user.user_id,
        name: skillName,
        category: type.toLowerCase(),
        experienceMonths: candidate.skillMonths[skillName],
        isStrong: (candidate.skillMonths[skillName] ?? 0) >= 24,
      },
    });
  }

  await prisma.cvExperience.create({
    data: {
      userId: user.user_id,
      company: candidate.experience.company,
      position: candidate.experience.position,
      startDate: candidate.experience.startDate,
      description: candidate.experience.description,
    },
  });

  const educationStart = new Date(`${2015 + (index % 6)}-09-01`);
  const educationEnd = new Date(`${2018 + (index % 6)}-06-01`);
  await prisma.cvEducation.create({
    data: {
      userId: user.user_id,
      school: candidate.education.school,
      degree: candidate.education.degree,
      major: candidate.education.major,
      startDate: educationStart,
      endDate: educationEnd,
      description: `${candidate.education.degree} - ${candidate.education.major}`,
    },
  });

  for (const certificate of candidate.certificates) {
    await prisma.cvCertificate.create({
      data: {
        userId: user.user_id,
        title: certificate.title,
        issuer: certificate.issuer,
        issuedDate: new Date('2025-01-15'),
      },
    });
  }

  await prisma.cvProject.create({
    data: {
      userId: user.user_id,
      name: candidate.project.name,
      role: candidate.project.role,
      description: candidate.project.description,
      link: candidate.project.link,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-10-01'),
    },
  });

  for (const softSkill of candidate.softSkills) {
    await prisma.cvPersonality.create({
      data: {
        userId: user.user_id,
        type: softSkill,
        description: `Ứng viên thể hiện kỹ năng ${softSkill} trong công việc và dự án Sales.`,
      },
    });
  }

  await prisma.jobPostActivity.deleteMany({
    where: { seeker_id: user.user_id, job_post_id: { not: jobId } },
  });
  const application = await prisma.jobPostActivity.upsert({
    where: { seeker_id_job_post_id: { seeker_id: user.user_id, job_post_id: jobId } },
    create: {
      seeker_id: user.user_id,
      job_post_id: jobId,
      apply_date: daysAgo(1 + (index % 14)),
      cover_letter: candidate.coverLetter,
      cv_url: cvUrl,
      current_stage: 'APPLICATION_SUBMITTED',
      status: 'APPLIED',
      last_updated: now(),
    },
    update: {
      apply_date: daysAgo(1 + (index % 14)),
      cover_letter: candidate.coverLetter,
      cv_url: cvUrl,
      current_stage: 'APPLICATION_SUBMITTED',
      status: 'APPLIED',
      rejection_reason: null,
      last_updated: now(),
      ai_score: null,
      ai_recommendation: null,
      ai_summary: null,
      ai_strengths: null,
      ai_concerns: null,
      ai_screened_at: null,
      ai_screened_by_id: null,
      ai_model: null,
      ai_raw_result: null,
    },
  });
  return {
    applicationId: application.application_id,
    email: candidate.email,
    expectedTier: candidate.expectedTier,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
  const { job, employee, category, jobType } = await ensureJob();
  const candidates = Array.from({ length: CANDIDATE_COUNT }, (_, index) => buildCandidate(index));
  const applications = [];

  for (const [index, candidate] of candidates.entries()) {
    applications.push(await seedCandidate(candidate, job.job_post_id, index));
    if ((index + 1) % 10 === 0) console.log(`Seeded ${index + 1}/${CANDIDATE_COUNT} candidates`);
  }

  const distribution = applications.reduce((result, item) => {
    result[item.expectedTier] = (result[item.expectedTier] ?? 0) + 1;
    return result;
  }, {});
  console.log(
    JSON.stringify(
      {
        jobId: job.job_post_id,
        jobTitle: job.job_title,
        companyId: employee.company_id,
        employeeId: employee.employee_id,
        category: category.name,
        jobType: jobType.job_type,
        createdCount: applications.length,
        expectedDistribution: distribution,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
