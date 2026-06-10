export const EXPERIENCE_EXTRA_YEARS_CONFIG: Record<
  string,
  Record<string, number | null>
> = {
  fullstack: {
    fresher: 0.5,
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
    architect: 4,
  },
  backend: {
    fresher: 0.5,
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
    architect: 4,
  },
  frontend: {
    fresher: 0.5,
    junior: 1,
    middle: 2,
    senior: 2,
    lead: 3,
    architect: 4,
  },
  mobile: {
    fresher: 0.5,
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
    architect: 4,
  },
  qa_manual: {
    fresher: 0.5,
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
  },
  qa_automation: {
    middle: 2,
    senior: 3,
    lead: 3,
  },
  devops: {
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
    architect: 4,
  },
  cloud_platform: {
    architect: 4,
  },
  data_analyst: {
    junior: 1,
    middle: 2,
  },
  data_engineer: {
    middle: 2,
    senior: 3,
    lead: 4,
  },
  ai_ml_engineer: {
    middle: 2,
    senior: 3,
    lead: 4,
  },
  mlops_ai_lead: {
    lead: 4,
  },
  business_analyst: {
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
  },
  product_owner: {
    middle: 3,
    senior: 3,
  },
  product_manager: {
    manager: 3,
  },
  head_of_product: {
    head: null,
  },
  ui_ux: {
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
    manager: 4,
  },
  other: {
    junior: 1,
    middle: 2,
    senior: 3,
    lead: 3,
  },
};

export const EXPERIENCE_EXTRA_YEARS_LEVEL_FALLBACK: Record<string, number> = {
  senior: 3,
  middle: 2,
  junior: 1,
  lead: 3,
  architect: 4,
  other: 2,
};
