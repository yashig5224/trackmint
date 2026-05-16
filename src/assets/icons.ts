import food from "./categories/food.png";
import shopping from "./categories/shopping.png";
import travel from "./categories/travel.png";
import bills from "./categories/bills.png";
import entertainment from "./categories/entertainment.png";
import health from "./categories/health.png";
import education from "./categories/education.png";
import salary from "./categories/salary.png";
import investment from "./categories/investment.png";
import other from "./categories/other.png";

import navOverview from "./nav/overview.png";
import navTransactions from "./nav/transactions.png";
import navGoals from "./nav/goals.png";
import navReports from "./nav/reports.png";

export const CATEGORY_ICONS: Record<string, string> = {
  Food: food,
  Shopping: shopping,
  Travel: travel,
  Bills: bills,
  Entertainment: entertainment,
  Health: health,
  Education: education,
  Salary: salary,
  Income: salary,
  Investment: investment,
  Transport: travel,
  Other: other,
};

export const getCategoryIcon = (cat?: string | null) =>
  CATEGORY_ICONS[cat || "Other"] || other;

export const NAV_ICONS = {
  overview: navOverview,
  transactions: navTransactions,
  goals: navGoals,
  reports: navReports,
};
