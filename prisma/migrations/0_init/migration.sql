-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('TECHNICAL', 'SOFT', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SEEKER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateTable
CREATE TABLE "Category" (
    "category_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Company" (
    "company_id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "profile_description" TEXT,
    "company_type" TEXT,
    "company_industry" TEXT,
    "establishment_date" TIMESTAMP(3),
    "company_size" TEXT,
    "country" TEXT,
    "city" TEXT,
    "working_days" TEXT,
    "working_time" TEXT,
    "overtime_policy" TEXT,
    "company_website_url" TEXT,
    "company_email" TEXT,
    "company_image" TEXT,
    "cover_image" TEXT,
    "key_skills" TEXT,
    "why_love_working_here" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "CompanyFollow" (
    "follow_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "followed_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CompanyFollow_pkey" PRIMARY KEY ("follow_id")
);

-- CreateTable
CREATE TABLE "CompanySeekerLike" (
    "company_seeker_like_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "liked_by_employee_id" INTEGER NOT NULL,
    "liked_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CompanySeekerLike_pkey" PRIMARY KEY ("company_seeker_like_id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "conversation_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "employee_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "joined_date" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "InterviewSchedule" (
    "id" SERIAL NOT NULL,
    "job_post_activity_id" INTEGER NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "interview_round" INTEGER NOT NULL,
    "interview_type" TEXT,
    "interview_date" TIMESTAMP(3),
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "location" TEXT,
    "status" "InterviewStatus" NOT NULL,
    "note" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBookmark" (
    "job_bookmark_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "job_post_id" INTEGER NOT NULL,
    "bookmarked_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobBookmark_pkey" PRIMARY KEY ("job_bookmark_id")
);

-- CreateTable
CREATE TABLE "JobPost" (
    "job_post_id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "job_type_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "job_url" TEXT,
    "job_description" TEXT,
    "candidate_requirements" TEXT,
    "benefits" TEXT,
    "work_location" TEXT,
    "work_time" TEXT,
    "work_type" "WorkType",
    "level" TEXT,
    "experience" TEXT,
    "education" TEXT,
    "salary" TEXT,
    "number_of_hires" INTEGER,
    "deadline" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("job_post_id")
);

-- CreateTable
CREATE TABLE "JobPostActivity" (
    "application_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "job_post_id" INTEGER NOT NULL,
    "apply_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_stage" TEXT,
    "status" "ApplicationStatus" NOT NULL,
    "rejection_reason" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPostActivity_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "JobPostSkill" (
    "job_post_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "required_level" TEXT,
    "min_experience_months" INTEGER,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER,

    CONSTRAINT "JobPostSkill_pkey" PRIMARY KEY ("job_post_id","skill_id")
);

-- CreateTable
CREATE TABLE "JobType" (
    "job_type_id" SERIAL NOT NULL,
    "job_type" TEXT NOT NULL,

    CONSTRAINT "JobType_pkey" PRIMARY KEY ("job_type_id")
);

-- CreateTable
CREATE TABLE "Message" (
    "message_id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "Seeker" (
    "seeker_id" INTEGER NOT NULL,
    "file_cv" TEXT,
    "github_url" TEXT,
    "linkedin_url" TEXT,
    "portfolio_url" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seeker_pkey" PRIMARY KEY ("seeker_id")
);

-- CreateTable
CREATE TABLE "SeekerCertificate" (
    "seeker_certificate_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "certificate_name" TEXT NOT NULL,
    "certificate_type" TEXT NOT NULL,
    "issuing_organization" TEXT,
    "score" TEXT,
    "issued_date" TIMESTAMP(3),
    "expired_date" TIMESTAMP(3),
    "certificate_file" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerCertificate_pkey" PRIMARY KEY ("seeker_certificate_id")
);

-- CreateTable
CREATE TABLE "SeekerEducation" (
    "education_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "certificate_degree_name" TEXT,
    "major" TEXT,
    "institute_university_name" TEXT,
    "starting_date" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "cgpa" DOUBLE PRECISION,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerEducation_pkey" PRIMARY KEY ("education_id")
);

-- CreateTable
CREATE TABLE "SeekerExperience" (
    "experience_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_current_job" BOOLEAN NOT NULL DEFAULT false,
    "job_title" TEXT,
    "company_name" TEXT,
    "description" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerExperience_pkey" PRIMARY KEY ("experience_id")
);

-- CreateTable
CREATE TABLE "SeekerProfileSummary" (
    "seeker_id" INTEGER NOT NULL,
    "about_me" TEXT,
    "strengths" TEXT,
    "career_objective" TEXT,
    "personality_traits" TEXT,
    "work_attitude" TEXT,
    "preferred_work_environment" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerProfileSummary_pkey" PRIMARY KEY ("seeker_id")
);

-- CreateTable
CREATE TABLE "SeekerProject" (
    "project_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_description" TEXT,
    "role" TEXT,
    "technologies" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "project_url" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerProject_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "SeekerSkill" (
    "seeker_skill_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "experience_months" INTEGER,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerSkill_pkey" PRIMARY KEY ("seeker_skill_id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "skill_id" SERIAL NOT NULL,
    "skill_name" TEXT NOT NULL,
    "skill_type" "SkillType" NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "user_image" TEXT,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFollow_seeker_id_company_id_key" ON "CompanyFollow"("seeker_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "JobBookmark_seeker_id_job_post_id_key" ON "JobBookmark"("seeker_id", "job_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "SeekerSkill_seeker_id_skill_id_key" ON "SeekerSkill"("seeker_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_skill_name_key" ON "Skill"("skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySeekerLike" ADD CONSTRAINT "CompanySeekerLike_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySeekerLike" ADD CONSTRAINT "CompanySeekerLike_liked_by_employee_id_fkey" FOREIGN KEY ("liked_by_employee_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySeekerLike" ADD CONSTRAINT "CompanySeekerLike_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_job_post_activity_id_fkey" FOREIGN KEY ("job_post_activity_id") REFERENCES "JobPostActivity"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBookmark" ADD CONSTRAINT "JobBookmark_job_post_id_fkey" FOREIGN KEY ("job_post_id") REFERENCES "JobPost"("job_post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBookmark" ADD CONSTRAINT "JobBookmark_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_job_type_id_fkey" FOREIGN KEY ("job_type_id") REFERENCES "JobType"("job_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostActivity" ADD CONSTRAINT "JobPostActivity_job_post_id_fkey" FOREIGN KEY ("job_post_id") REFERENCES "JobPost"("job_post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostActivity" ADD CONSTRAINT "JobPostActivity_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostSkill" ADD CONSTRAINT "JobPostSkill_job_post_id_fkey" FOREIGN KEY ("job_post_id") REFERENCES "JobPost"("job_post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostSkill" ADD CONSTRAINT "JobPostSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("conversation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seeker" ADD CONSTRAINT "Seeker_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerCertificate" ADD CONSTRAINT "SeekerCertificate_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerEducation" ADD CONSTRAINT "SeekerEducation_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerExperience" ADD CONSTRAINT "SeekerExperience_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerProfileSummary" ADD CONSTRAINT "SeekerProfileSummary_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerProject" ADD CONSTRAINT "SeekerProject_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerSkill" ADD CONSTRAINT "SeekerSkill_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerSkill" ADD CONSTRAINT "SeekerSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

