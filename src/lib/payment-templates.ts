export type PaymentTemplate = {
  id: "payroll" | "subscription" | "contractor" | "allowance";
  name: string;
  simpleDescription: string;
  proDescription: string;
  cadenceHours: 24 | 168;
  amountEth: string;
  suggestedRecipientLabel: string;
};

export const paymentTemplates: PaymentTemplate[] = [
  {
    id: "payroll",
    name: "Weekly payroll",
    simpleDescription: "Send the same small test payment to a team wallet each week.",
    proDescription: "Weekly fixed-value transfer to an allowlisted payroll recipient.",
    cadenceHours: 168,
    amountEth: "0.0001",
    suggestedRecipientLabel: "Payroll wallet",
  },
  {
    id: "subscription",
    name: "Service subscription",
    simpleDescription: "Pay a trusted service wallet on a predictable schedule.",
    proDescription: "Daily fixed-value service payment with policy-bound execution.",
    cadenceHours: 24,
    amountEth: "0.00002",
    suggestedRecipientLabel: "Service wallet",
  },
  {
    id: "contractor",
    name: "Contractor payment",
    simpleDescription: "Schedule a small weekly payment to a verified contractor.",
    proDescription: "Weekly transfer to an independently verified recipient address.",
    cadenceHours: 168,
    amountEth: "0.00005",
    suggestedRecipientLabel: "Contractor",
  },
  {
    id: "allowance",
    name: "Agent allowance",
    simpleDescription: "Give another wallet a tiny daily operating budget.",
    proDescription: "Daily bounded allowance below the configured approval threshold.",
    cadenceHours: 24,
    amountEth: "0.00001",
    suggestedRecipientLabel: "Operations wallet",
  },
];

export function getPaymentTemplate(id: PaymentTemplate["id"]) {
  return paymentTemplates.find((template) => template.id === id);
}
