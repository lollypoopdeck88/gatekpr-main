export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  homes: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 79,
    description: "For communities up to 100 homes",
    homes: "1-100",
    features: [
      "All core features",
      "Unlimited payment schedules",
      "Unlimited announcements",
      "Unlimited documents",
      "Resident directory",
      "Email support",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 129,
    description: "For communities of 101-200 homes",
    homes: "101-200",
    features: [
      "Everything in Starter",
      "Priority email support",
      "Onboarding assistance",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 179,
    description: "For communities of 201-300 homes",
    homes: "201-300",
    features: [
      "Everything in Standard",
      "Dedicated account manager",
      "Custom onboarding",
      "Phone support",
    ],
  },
];
