import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const now = () => new Date();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const candidates = [
  {
    email: 'ai.demo.strong.backend@itjobvn.local',
    fullName: 'Nguyen Minh Khoa',
    phone: '0901000001',
    github: 'https://github.com/minhkhoa-backend',
    linkedin: 'https://linkedin.com/in/minhkhoa-backend',
    portfolio: 'https://minhkhoa.dev',
    coverLetter:
      'Tôi có hơn 5 năm xây dựng backend Node.js/NestJS cho hệ thống SaaS, tối ưu PostgreSQL, Redis và triển khai Docker/Kubernetes.',
    skills: [
      'Node.js',
      'NestJS',
      'TypeScript',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'Docker',
      'REST API',
      'Microservices',
      'AWS',
    ],
    skillMonths: {
      'Node.js': 72,
      NestJS: 60,
      'REST API': 72,
      TypeScript: 60,
      PostgreSQL: 60,
    },
    experiences: [
      {
        company: 'Fintech Platform Vietnam',
        position: 'Senior Backend Engineer',
        startDate: '2020-03-01',
        endDate: null,
        description:
          'Thiết kế hệ thống NestJS microservices, API authentication, PostgreSQL query optimization, Redis caching, Docker CI/CD và monitoring.',
      },
      {
        company: 'E-commerce SaaS',
        position: 'Backend Engineer',
        startDate: '2018-06-01',
        endDate: '2020-02-01',
        description:
          'Xây dựng REST API Node.js, tích hợp payment, queue xử lý đơn hàng và database migration cho PostgreSQL.',
      },
    ],
    education: {
      school: 'Đại học Bách Khoa TP.HCM',
      degree: 'Kỹ sư',
      major: 'Khoa học máy tính',
    },
    certificates: [
      { title: 'AWS Certified Developer Associate', issuer: 'Amazon Web Services' },
      { title: 'Docker for Developers', issuer: 'Udemy' },
    ],
    projects: [
      {
        name: 'Recruitment Matching API',
        role: 'Backend Lead',
        description:
          'NestJS service đánh giá độ phù hợp ứng viên, PostgreSQL full-text search, Redis cache và worker xử lý nền.',
        link: 'https://github.com/minhkhoa/recruitment-api',
      },
    ],
    summary: {
      about:
        'Backend engineer mạnh về Node.js, NestJS, database design, performance và cloud deployment.',
      strengths:
        'Thiết kế API rõ ràng, tối ưu PostgreSQL, xử lý hệ thống tải cao, làm việc tốt với product và QA.',
      objective: 'Tìm vai trò Senior Backend Engineer có trách nhiệm thiết kế kiến trúc và mentoring.',
    },
  },
  {
    email: 'ai.demo.match.backend@itjobvn.local',
    fullName: 'Tran Hoang Linh',
    phone: '0901000002',
    github: 'https://github.com/hoanglinh-api',
    linkedin: 'https://linkedin.com/in/hoanglinh-api',
    portfolio: null,
    coverLetter:
      'Tôi có 3 năm kinh nghiệm Node.js, Express và gần 1 năm NestJS, từng làm REST API, PostgreSQL và Docker cơ bản.',
    skills: ['Node.js', 'NestJS', 'Express.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Git', 'REST API'],
    skillMonths: {
      'Node.js': 48,
      NestJS: 12,
      'REST API': 36,
      TypeScript: 36,
      PostgreSQL: 36,
    },
    experiences: [
      {
        company: 'HR Tech Startup',
        position: 'Backend Developer',
        startDate: '2021-08-01',
        endDate: null,
        description:
          'Phát triển REST API tuyển dụng bằng Node.js và NestJS, phân quyền JWT, PostgreSQL, upload CV và tích hợp email notification.',
      },
    ],
    education: {
      school: 'Đại học Công nghệ Thông tin',
      degree: 'Cử nhân',
      major: 'Kỹ thuật phần mềm',
    },
    certificates: [{ title: 'Node.js Backend Bootcamp', issuer: 'F8 Education' }],
    projects: [
      {
        name: 'Applicant Tracking System',
        role: 'Backend Developer',
        description: 'REST API quản lý job, ứng viên, application status với Node.js, PostgreSQL và JWT.',
        link: 'https://github.com/hoanglinh/ats-api',
      },
    ],
    summary: {
      about: 'Backend developer tập trung vào Node.js/NestJS và API cho sản phẩm tuyển dụng.',
      strengths: 'Nắm tốt REST API, authentication, database schema và phối hợp frontend.',
      objective: 'Muốn phát triển lên Senior Backend Engineer trong môi trường dùng NestJS.',
    },
  },
  {
    email: 'ai.demo.review.fullstack@itjobvn.local',
    fullName: 'Le Gia Han',
    phone: '0901000003',
    github: 'https://github.com/giahan-fullstack',
    linkedin: 'https://linkedin.com/in/giahan-fullstack',
    portfolio: 'https://giahan.dev',
    coverLetter:
      'Tôi là full-stack developer thiên về React, có kinh nghiệm Node.js/Express và đang học NestJS. Mong muốn chuyển sâu sang backend.',
    skills: ['React', 'Next.js', 'Node.js', 'Express.js', 'MySQL', 'JavaScript', 'REST API', 'Tailwind CSS'],
    skillMonths: {
      'Node.js': 24,
      'REST API': 18,
    },
    experiences: [
      {
        company: 'Digital Product Studio',
        position: 'Full-stack Developer',
        startDate: '2022-02-01',
        endDate: null,
        description:
          'Xây dựng dashboard React/Next.js, một số API Node.js/Express, MySQL và tích hợp third-party services.',
      },
    ],
    education: {
      school: 'Đại học Sư phạm Kỹ thuật TP.HCM',
      degree: 'Cử nhân',
      major: 'Công nghệ thông tin',
    },
    certificates: [{ title: 'Full-stack Web Development', issuer: 'Coursera' }],
    projects: [
      {
        name: 'Internal Admin Dashboard',
        role: 'Full-stack Developer',
        description: 'React dashboard và Express API quản lý người dùng, báo cáo và phân quyền cơ bản.',
        link: 'https://github.com/giahan/admin-dashboard',
      },
    ],
    summary: {
      about: 'Full-stack developer mạnh frontend, có nền Node.js nhưng chưa có nhiều NestJS production.',
      strengths: 'Hiểu luồng sản phẩm, giao tiếp tốt, có khả năng học nhanh backend framework mới.',
      objective: 'Chuyển hướng sang backend Node.js/NestJS chuyên sâu.',
    },
  },
  {
    email: 'ai.demo.low.mobile@itjobvn.local',
    fullName: 'Pham Quoc Bao',
    phone: '0901000004',
    github: 'https://github.com/quocbao-mobile',
    linkedin: null,
    portfolio: null,
    coverLetter:
      'Tôi có kinh nghiệm mobile Flutter và QA automation, muốn thử sức ở vị trí backend Node.js.',
    skills: ['Flutter', 'Dart', 'Firebase', 'Manual Testing', 'QA Automation', 'Postman'],
    experiences: [
      {
        company: 'Mobile Outsourcing Team',
        position: 'Flutter Developer',
        startDate: '2015-01-01',
        endDate: null,
        description:
          'Phát triển ứng dụng Flutter, tích hợp Firebase Auth/Firestore, viết test case và phối hợp QA.',
      },
    ],
    education: {
      school: 'Cao đẳng FPT Polytechnic',
      degree: 'Cao đẳng',
      major: 'Phát triển phần mềm',
    },
    certificates: [{ title: 'Flutter Mobile Development', issuer: 'Google Developer Group' }],
    projects: [
      {
        name: 'Expense Mobile App',
        role: 'Mobile Developer',
        description: 'Ứng dụng Flutter quản lý chi tiêu cá nhân, Firebase backend và push notification.',
        link: 'https://github.com/quocbao/expense-mobile',
      },
    ],
    summary: {
      about: 'Mobile developer muốn chuyển sang backend, chưa có kinh nghiệm NestJS/PostgreSQL production.',
      strengths: 'Cẩn thận, có tư duy kiểm thử, quen làm việc với API từ phía client.',
      objective: 'Tìm cơ hội học backend Node.js ở cấp junior/mid.',
    },
  },
];

async function findTargetJob() {
  const envJobId = Number(process.env.JOB_ID);

  if (Number.isInteger(envJobId) && envJobId > 0) {
    const job = await prisma.jobPost.findUnique({ where: { job_post_id: envJobId } });
    if (job) return job;
  }

  const job =
    (await prisma.jobPost.findFirst({
      where: {
        OR: [
          { job_title: { contains: 'NestJS', mode: 'insensitive' } },
          { name: { contains: 'NestJS', mode: 'insensitive' } },
          { job_title: { contains: 'Backend', mode: 'insensitive' } },
          { name: { contains: 'Backend', mode: 'insensitive' } },
        ],
      },
      orderBy: { job_post_id: 'asc' },
    })) ??
    (await prisma.jobPost.findFirst({
      orderBy: { job_post_id: 'asc' },
    }));

  if (!job) {
    throw new Error('Không tìm thấy JobPost để seed hồ sơ ứng tuyển.');
  }

  return job;
}

async function ensureSkill(name) {
  return prisma.skill.upsert({
    where: { skill_name: name },
    create: {
      skill_name: name,
      skill_type: 'TECHNICAL',
      updated_date: now(),
    },
    update: {
      updated_date: now(),
    },
  });
}

async function resetCandidateCv(seekerId) {
  await prisma.cvSkill.deleteMany({ where: { userId: seekerId } });
  await prisma.cvExperience.deleteMany({ where: { userId: seekerId } });
  await prisma.cvEducation.deleteMany({ where: { userId: seekerId } });
  await prisma.cvCertificate.deleteMany({ where: { userId: seekerId } });
  await prisma.cvProject.deleteMany({ where: { userId: seekerId } });
  await prisma.cvPersonality.deleteMany({ where: { userId: seekerId } });
}

async function seedCandidate(candidate, job) {
  const user = await prisma.user.upsert({
    where: { email: candidate.email },
    create: {
      email: candidate.email,
      password: '$2b$10$aiScreeningDemoPasswordHash',
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

  await prisma.seeker.upsert({
    where: { seeker_id: user.user_id },
    create: {
      seeker_id: user.user_id,
      file_cv: `https://example.com/cv/${candidate.email}.pdf`,
      github_url: candidate.github,
      linkedin_url: candidate.linkedin,
      portfolio_url: candidate.portfolio,
      updated_date: now(),
    },
    update: {
      file_cv: `https://example.com/cv/${candidate.email}.pdf`,
      github_url: candidate.github,
      linkedin_url: candidate.linkedin,
      portfolio_url: candidate.portfolio,
      updated_date: now(),
    },
  });

  await resetCandidateCv(user.user_id);

  for (const skillName of candidate.skills) {
    await ensureSkill(skillName);
    await prisma.cvSkill.create({
      data: {
        userId: user.user_id,
        name: skillName,
        experienceMonths: candidate.skillMonths?.[skillName] ?? 18,
        isStrong: Boolean(
          candidate.skillMonths?.[skillName] &&
            candidate.skillMonths[skillName] >= 24,
        ),
      },
    });
  }

  for (const experience of candidate.experiences) {
    await prisma.cvExperience.create({
      data: {
        userId: user.user_id,
        company: experience.company,
        position: experience.position,
        startDate: new Date(experience.startDate),
        endDate: experience.endDate ? new Date(experience.endDate) : null,
        description: experience.description,
      },
    });
  }

  await prisma.cvEducation.create({
    data: {
      userId: user.user_id,
      school: candidate.education.school,
      degree: candidate.education.degree,
      major: candidate.education.major,
      startDate: new Date('2016-09-01'),
      endDate: new Date('2020-06-01'),
      description: `${candidate.education.degree} - ${candidate.education.major}`,
    },
  });
  for (const certificate of candidate.certificates) {
    await prisma.cvCertificate.create({
      data: {
        userId: user.user_id,
        title: certificate.title,
        issuer: certificate.issuer,
        issuedDate: new Date('2023-01-15'),
      },
    });
  }

  for (const project of candidate.projects) {
    await prisma.cvProject.create({
      data: {
        userId: user.user_id,
        name: project.name,
        role: project.role,
        description: project.description,
        link: project.link,
        startDate: new Date('2023-02-01'),
        endDate: new Date('2023-10-01'),
      },
    });
  }
  await prisma.cvPersonality.create({
    data: {
      userId: user.user_id,
      type: 'Ownership',
      description: `${candidate.summary.about} ${candidate.summary.strengths} ${candidate.summary.objective}`,
    },
  });

  const application = await prisma.jobPostActivity.upsert({
    where: {
      seeker_id_job_post_id: {
        seeker_id: user.user_id,
        job_post_id: job.job_post_id,
      },
    },
    create: {
      seeker_id: user.user_id,
      job_post_id: job.job_post_id,
      apply_date: daysAgo(1 + Math.floor(Math.random() * 7)),
      cover_letter: candidate.coverLetter,
      cv_url: `https://example.com/cv/${candidate.email}.pdf`,
      current_stage: 'APPLICATION_SUBMITTED',
      status: 'APPLIED',
      last_updated: now(),
    },
    update: {
      cover_letter: candidate.coverLetter,
      cv_url: `https://example.com/cv/${candidate.email}.pdf`,
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
    seekerId: user.user_id,
    email: candidate.email,
    fullName: candidate.fullName,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const job = await findTargetJob();
  const created = [];

  for (const candidate of candidates) {
    created.push(await seedCandidate(candidate, job));
  }

  console.log(
    JSON.stringify(
      {
        jobId: job.job_post_id,
        jobTitle: job.job_title || job.name,
        createdCount: created.length,
        applications: created,
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
