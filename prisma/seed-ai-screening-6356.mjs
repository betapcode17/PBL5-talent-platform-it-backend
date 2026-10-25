import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CANDIDATE_COUNT = 100;
const TARGET_JOB_ID = 6356;

const JOB_TITLE = 'AI/ML Engineer';

const JOB_REQUIREMENTS = ['Python', 'TensorFlow', 'PyTorch', 'Data Science'];

const JOB_DESCRIPTION = `
Machine learning and AI model development.
Thiết kế, huấn luyện, đánh giá và tối ưu mô hình AI/ML.
Làm việc với dữ liệu lớn, xây dựng pipeline xử lý dữ liệu và triển khai mô hình vào hệ thống thực tế.
`.trim();

const TECHNICAL_JOB_SKILLS = [
  { name: 'Python', mandatory: true, months: 24, priority: 1 },
  { name: 'TensorFlow', mandatory: true, months: 18, priority: 2 },
  { name: 'PyTorch', mandatory: true, months: 18, priority: 3 },
  { name: 'Data Science', mandatory: true, months: 18, priority: 4 },
  { name: 'Machine Learning', mandatory: true, months: 24, priority: 5 },
  { name: 'Deep Learning', mandatory: true, months: 18, priority: 6 },
  { name: 'Pandas', mandatory: false, months: 12, priority: 7 },
  { name: 'NumPy', mandatory: false, months: 12, priority: 8 },
  { name: 'Scikit-learn', mandatory: false, months: 12, priority: 9 },
  { name: 'SQL', mandatory: false, months: 12, priority: 10 },
  { name: 'Docker', mandatory: false, months: 6, priority: 11 },
];

const SOFT_JOB_SKILLS = [
  { name: 'Problem Solving', mandatory: true, months: 12, priority: 12 },
  { name: 'Analytical Thinking', mandatory: true, months: 12, priority: 13 },
  { name: 'Research Skill', mandatory: false, months: 6, priority: 14 },
  { name: 'Communication', mandatory: false, months: 6, priority: 15 },
  { name: 'Teamwork', mandatory: false, months: 6, priority: 16 },
];

const LANGUAGE_JOB_SKILLS = [
  {
    name: 'English Technical Reading',
    mandatory: false,
    months: 12,
    priority: 17,
  },
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

const LAST_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Ngô',
];

const UNIVERSITIES = [
  'Đại học Bách khoa Hà Nội',
  'Đại học Công nghệ - ĐHQGHN',
  'Đại học Bách khoa TP.HCM',
  'Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
  'Đại học FPT',
  'Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
  'Đại học Sư phạm Kỹ thuật TP.HCM',
  'Đại học Duy Tân',
];

const COMPANIES = [
  'AI Research Vietnam',
  'Data Science Lab',
  'VisionTech AI',
  'NLP Solutions',
  'Smart Analytics Hub',
  'Machine Learning Center',
];

const now = () => new Date();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const unique = (values) => [...new Set(values)];

function tierFor(index) {
  if (index < 20)
    return { key: 'excellent', label: 'Excellent match', years: 4 };
  if (index < 45) return { key: 'strong', label: 'Strong match', years: 3 };
  if (index < 70) return { key: 'partial', label: 'Partial match', years: 1.5 };
  if (index < 85) return { key: 'weak', label: 'Weak match', years: 0.8 };
  return { key: 'unrelated', label: 'Unrelated profile', years: 2 };
}

function buildCandidate(index) {
  const tier = tierFor(index);
  const number = String(index + 1).padStart(3, '0');
  const fullName = `${LAST_NAMES[index % LAST_NAMES.length]} ${FIRST_NAMES[index % FIRST_NAMES.length]} ${number}`;

  const technicalByTier = {
    excellent: [
      'Python',
      'TensorFlow',
      'PyTorch',
      'Data Science',
      'Machine Learning',
      'Deep Learning',
      'Pandas',
      'NumPy',
      'Scikit-learn',
      'SQL',
      'Docker',
      'Model Deployment',
      'MLOps',
    ],
    strong: [
      'Python',
      'TensorFlow',
      'PyTorch',
      'Data Science',
      'Machine Learning',
      'Deep Learning',
      'Pandas',
      'NumPy',
      'Scikit-learn',
      'SQL',
    ],
    partial: [
      'Python',
      'Data Science',
      'Machine Learning',
      'Pandas',
      'NumPy',
      'SQL',
      'Data Analysis',
    ],
    weak: ['Python', 'SQL', 'Excel', 'Data Analysis', 'Basic Statistics'],
    unrelated: [
      'HTML',
      'CSS',
      'JavaScript',
      'Customer Service',
      'Content Marketing',
    ],
  }[tier.key];

  const softByTier = {
    excellent: SOFT_JOB_SKILLS.map((skill) => skill.name),
    strong: [
      'Problem Solving',
      'Analytical Thinking',
      'Research Skill',
      'Communication',
    ],
    partial: ['Problem Solving', 'Analytical Thinking', 'Teamwork'],
    weak: ['Teamwork', 'Communication'],
    unrelated: ['Teamwork', 'Time Management'],
  }[tier.key];

  const english =
    tier.key === 'excellent' || tier.key === 'strong'
      ? 'English Technical Reading'
      : tier.key === 'partial'
        ? 'English Basic Communication'
        : 'English Elementary Communication';

  const languageSkills = [english];
  const skills = unique([...technicalByTier, ...softByTier, ...languageSkills]);

  const months = Math.round(tier.years * 12);
  const startDate = new Date();
  startDate.setUTCMonth(startDate.getUTCMonth() - months);

  const role =
    tier.key === 'excellent'
      ? 'Senior AI/ML Engineer'
      : tier.key === 'strong'
        ? 'Machine Learning Engineer'
        : tier.key === 'partial'
          ? 'Junior Data Scientist'
          : tier.key === 'weak'
            ? 'Data Analyst Intern'
            : 'Frontend Developer';

  const aiContext =
    tier.key === 'excellent'
      ? 'thiết kế, huấn luyện và triển khai mô hình Machine Learning, Deep Learning bằng Python, TensorFlow và PyTorch'
      : tier.key === 'strong'
        ? 'xây dựng mô hình Machine Learning, xử lý dữ liệu và đánh giá mô hình bằng Python, TensorFlow, PyTorch'
        : tier.key === 'partial'
          ? 'phân tích dữ liệu, xây dựng mô hình Machine Learning cơ bản bằng Python và Scikit-learn'
          : tier.key === 'weak'
            ? 'phân tích dữ liệu bằng Python, SQL và Excel, mới tiếp cận Machine Learning cơ bản'
            : 'phát triển giao diện web và hỗ trợ vận hành nội dung số, chưa có kinh nghiệm AI/ML';

  const achievement =
    tier.key === 'excellent'
      ? 'Đã triển khai mô hình classification và recommendation lên môi trường production, cải thiện F1-score 18%.'
      : tier.key === 'strong'
        ? 'Đã xây dựng pipeline huấn luyện mô hình và tối ưu accuracy cho bài toán dự đoán.'
        : tier.key === 'partial'
          ? 'Đã thực hiện project phân tích dữ liệu và huấn luyện mô hình dự đoán cơ bản.'
          : tier.key === 'weak'
            ? 'Có kinh nghiệm làm dashboard phân tích dữ liệu và xử lý dataset nhỏ.'
            : 'Chưa từng tham gia dự án Machine Learning hoặc Deep Learning.';

  const degree =
    tier.key === 'unrelated' && index % 3 === 0
      ? 'Cao đẳng'
      : index % 4 === 0
        ? 'Kỹ sư'
        : 'Cử nhân';

  const major =
    tier.key === 'unrelated'
      ? 'Thiết kế giao diện'
      : index % 3 === 0
        ? 'Artificial Intelligence'
        : index % 3 === 1
          ? 'Data Science'
          : 'Computer Science';

  const projectName =
    tier.key === 'unrelated'
      ? `E-commerce Frontend Website ${number}`
      : tier.key === 'weak'
        ? `Data Analysis Dashboard ${number}`
        : `AI Recommendation System ${number}`;

  const projectDescription =
    tier.key === 'unrelated'
      ? 'Xây dựng giao diện website thương mại điện tử bằng HTML, CSS và JavaScript.'
      : tier.key === 'weak'
        ? 'Làm sạch dữ liệu, trực quan hóa dữ liệu và xây dựng dashboard phân tích bằng Python, SQL và Excel.'
        : `Thu thập dữ liệu, tiền xử lý dữ liệu, huấn luyện mô hình Machine Learning, đánh giá bằng accuracy, precision, recall, F1-score và triển khai API dự đoán. ${achievement}`;

  return {
    expectedTier: tier.label,
    email: `ai.ml.candidate.${number}@itjobvn.local`,
    fullName,
    phone: `0902${String(100000 + index).slice(-6)}`,
    linkedin: `https://linkedin.com/in/ai-ml-candidate-${number}`,
    portfolio: `https://candidate-${number}.example.com/ai-ml-portfolio`,
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
      description: `${aiContext}. ${achievement} Có khả năng làm việc với dữ liệu, notebook, training pipeline và báo cáo kết quả mô hình.`,
    },
    education: {
      school: UNIVERSITIES[index % UNIVERSITIES.length],
      degree,
      major,
    },
    certificates: [
      {
        title:
          tier.key === 'unrelated'
            ? 'Frontend Web Development Certificate'
            : 'Machine Learning Specialization',
        type: 'Professional',
        issuer:
          tier.key === 'unrelated'
            ? 'Online Web Academy'
            : 'AI Learning Institute',
        score:
          tier.key === 'excellent'
            ? 'Excellent'
            : tier.key === 'strong'
              ? 'Good'
              : tier.key === 'partial'
                ? 'Passed'
                : 'Basic',
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
      link: `https://candidate-${number}.example.com/projects/ai-ml`,
    },
    coverLetter: `[Expected screening tier: ${tier.label}] Tôi ứng tuyển vị trí AI/ML Engineer. Tôi có kinh nghiệm liên quan đến ${technicalByTier.slice(0, 5).join(', ')}. ${achievement}`,
    summary: {
      about: `${role} có ${tier.years} năm kinh nghiệm. Kinh nghiệm chính: ${aiContext}.`,
      strengths: `${softByTier.join(', ')}. ${achievement}`,
      objective:
        tier.key === 'unrelated'
          ? 'Mong muốn chuyển hướng sang lĩnh vực công nghệ dữ liệu trong tương lai.'
          : 'Phát triển chuyên sâu trong lĩnh vực Artificial Intelligence, Machine Learning, Deep Learning và triển khai mô hình AI vào sản phẩm thực tế.',
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
  const job = await prisma.jobPost.findUnique({
    where: { job_post_id: TARGET_JOB_ID },
  });

  if (!job) {
    throw new Error(`Không tìm thấy job_post_id = ${TARGET_JOB_ID}`);
  }

  const updatedJob = await prisma.jobPost.update({
    where: { job_post_id: TARGET_JOB_ID },
    data: {
      name: JOB_TITLE,
      job_title: JOB_TITLE,
      job_description: JOB_DESCRIPTION,
      candidate_requirements: JOB_REQUIREMENTS.join('\n'),
      salary: '40000000-65000000',
      is_active: true,
      updated_date: now(),
    },
  });

  await prisma.jobPostSkill.deleteMany({
    where: { job_post_id: TARGET_JOB_ID },
  });

  for (const [skillType, definitions] of [
    ['TECHNICAL', TECHNICAL_JOB_SKILLS],
    ['SOFT', SOFT_JOB_SKILLS],
    ['LANGUAGE', LANGUAGE_JOB_SKILLS],
  ]) {
    for (const definition of definitions) {
      const skill = await ensureSkill(definition.name, skillType);

      await prisma.jobPostSkill.create({
        data: {
          job_post_id: TARGET_JOB_ID,
          skill_id: skill.skill_id,
          required_level: definition.mandatory ? 'Required' : 'Preferred',
          min_experience_months: definition.months,
          is_mandatory: definition.mandatory,
          priority: definition.priority,
        },
      });
    }
  }

  await prisma.jobAiCriteriaCache.deleteMany({
    where: { jobPostId: TARGET_JOB_ID },
  });

  return updatedJob;
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

  const cvUrl = `https://example.com/cv/ai-ml-${candidate.email}.pdf`;

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
    const type = skillName.startsWith('English')
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
  const educationEnd = new Date(`${2019 + (index % 6)}-06-01`);

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
        description: `Ứng viên thể hiện kỹ năng ${softSkill} trong quá trình làm việc với dữ liệu và dự án AI/ML.`,
      },
    });
  }

  await prisma.jobPostActivity.deleteMany({
    where: {
      seeker_id: user.user_id,
      job_post_id: { not: jobId },
    },
  });

  const application = await prisma.jobPostActivity.upsert({
    where: {
      seeker_id_job_post_id: {
        seeker_id: user.user_id,
        job_post_id: jobId,
      },
    },
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
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const job = await ensureJob();

  const candidates = Array.from({ length: CANDIDATE_COUNT }, (_, index) =>
    buildCandidate(index),
  );

  const applications = [];

  for (const [index, candidate] of candidates.entries()) {
    applications.push(await seedCandidate(candidate, job.job_post_id, index));

    if ((index + 1) % 10 === 0) {
      console.log(`Seeded ${index + 1}/${CANDIDATE_COUNT} candidates`);
    }
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
