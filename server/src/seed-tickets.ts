import "dotenv/config";
import { PrismaClient, TicketStatus, TicketCategory } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const statuses = [TicketStatus.open, TicketStatus.resolved, TicketStatus.closed];
const categories = [
  TicketCategory.general_question,
  TicketCategory.technical_question,
  TicketCategory.refund_request,
  null,
];

const senders: { name: string; email: string }[] = [
  { name: "Alice Thornton", email: "alice.thornton@example.com" },
  { name: "Ben Marsh", email: "ben.marsh@example.com" },
  { name: "Clara Voss", email: "clara.voss@example.com" },
  { name: "David Kim", email: "david.kim@example.com" },
  { name: "Elena Patel", email: "elena.patel@example.com" },
  { name: "Frank Osei", email: "frank.osei@example.com" },
  { name: "Grace Liu", email: "grace.liu@example.com" },
  { name: "Hassan Al-Amin", email: "hassan.alamin@example.com" },
  { name: "Isabella Ferreira", email: "isabella.ferreira@example.com" },
  { name: null, email: "noreply-orders@shopbot.io" },
];

const tickets: { subject: string; body: string; category: TicketCategory | null }[] = [
  {
    subject: "Can't log in to my account",
    body: "Hi, I've been trying to log in for the past hour but keep getting an 'Invalid credentials' error. I'm sure my password is correct. Please help.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Request a refund for order #8821",
    body: "I placed order #8821 last week and the item arrived damaged. I'd like a full refund. Please let me know the process.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "How do I update my billing address?",
    body: "I recently moved and need to update my billing address before my next invoice. Where do I do this in the dashboard?",
    category: TicketCategory.general_question,
  },
  {
    subject: "API rate limit errors in production",
    body: "Our integration has been hitting 429s since yesterday morning. We're well within our plan's stated limits. Is there an incident ongoing?",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund for duplicate charge",
    body: "I was charged twice for my subscription this month. Can you please refund the duplicate charge? Transaction IDs: TXN-4410 and TXN-4411.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Webhook not firing for order.completed events",
    body: "Our webhook endpoint hasn't received any order.completed events for two days. The endpoint is healthy and other event types arrive fine.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "What are your support hours?",
    body: "Quick question — what are your standard support hours and do you offer weekend coverage?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Cancel my subscription",
    body: "I'd like to cancel my subscription effective end of this billing cycle. Please confirm and send me a cancellation confirmation.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Export data in CSV format",
    body: "Is there a way to export all my transaction history as a CSV file? I need it for my accountant.",
    category: TicketCategory.general_question,
  },
  {
    subject: "SSO integration failing with SAML assertion error",
    body: "We're getting 'Invalid SAML assertion' when users try to sign in via our IdP. This started after we rotated our signing certificate.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Partial refund for item not delivered",
    body: "Order #9034 was missing one item. I'd like a partial refund for the undelivered item rather than returning the whole order.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Password reset email not arriving",
    body: "I clicked 'Forgot password' 20 minutes ago but haven't received the reset email. I've checked spam. Can you send it manually?",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Question about enterprise pricing",
    body: "We're evaluating your platform for our 500-seat organisation. Could you send me information on enterprise pricing and volume discounts?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Mobile app crashes on startup",
    body: "The iOS app crashes immediately after the splash screen on my iPhone 15 running iOS 17.4. I've reinstalled twice. App version 3.2.1.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund request — wrong item shipped",
    body: "I ordered the blue version but received the red one. I'd like either the correct item shipped or a full refund. Order #10214.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Two-factor authentication not working",
    body: "My authenticator app codes are being rejected even though the time is synced. I can't access my account.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "How do I add team members?",
    body: "I'm the account owner and want to invite three colleagues. I can't find the team management option in settings.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Invoice missing VAT number",
    body: "The invoice for last month's subscription doesn't include our VAT number. Can you reissue it? Our VAT number is GB123456789.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Search returning incorrect results",
    body: "The search feature returns results that don't match the query at all. For example, searching 'invoice' returns user records.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund for accidental annual upgrade",
    body: "I accidentally clicked 'Upgrade to Annual' and was charged immediately. I want to stay on monthly. Please refund the annual charge.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Data not syncing between devices",
    body: "Changes I make on my laptop don't appear on my phone and vice versa. This has been happening for three days.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Can I change my username?",
    body: "I'd like to change my username. The profile settings page only lets me change my display name, not the username.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Slow dashboard load times",
    body: "The dashboard takes over 30 seconds to load. My internet is fine — other sites are fast. This started after your last update.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Request refund — subscription unused",
    body: "I signed up by mistake and haven't used the service at all. I'd like a full refund under your 30-day money-back guarantee.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "File upload limit exceeded — what's the cap?",
    body: "I'm getting an error saying I've exceeded the file upload limit but I can't find what the limit is in the docs.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Notifications not sending",
    body: "I have email notifications enabled but stopped receiving them last Tuesday. My email address is correct in settings.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Wrong currency on invoice",
    body: "My invoices show USD but I'm based in the UK and pay in GBP. Please correct this and resend the last three invoices.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Refund for cancelled event ticket",
    body: "The event I purchased a ticket for (ID: EVT-5521) has been cancelled by the organiser. I'd like a full refund.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Custom domain not resolving",
    body: "I've set up my custom domain following the docs but it still shows 'This site can't be reached' after 48 hours.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Difference between Basic and Pro plans?",
    body: "I'm trying to decide between Basic and Pro. Can you explain the key differences, particularly around API access and storage?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Unable to delete account",
    body: "The 'Delete Account' button in settings shows a spinner and then nothing happens. I've tried Chrome and Firefox.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Partial refund — subscription overpayment",
    body: "I was charged for 10 seats but only have 7 users. Please refund the difference for the last three months.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "GDPR data export request",
    body: "Under GDPR Article 20, I'm requesting a full export of all personal data you hold about me.",
    category: TicketCategory.general_question,
  },
  {
    subject: "CSV import fails silently",
    body: "When I upload a CSV with more than 500 rows the import says 'Success' but no records appear. Smaller files work fine.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund — product not as described",
    body: "The product listing said 'includes premium support' but when I tried to use it I was told it's not included. I'd like a refund.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Discount code not applying at checkout",
    body: "I have a valid discount code (SAVE20) but when I enter it at checkout it says 'Invalid or expired'. The email says it expires next month.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Report generation times out",
    body: "Generating any report with a date range longer than 30 days results in a timeout error. This makes the annual report feature unusable.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund request — billing after cancellation",
    body: "I cancelled my subscription on 15 January but was still charged on 1 February. Please refund the erroneous charge.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Is there a dark mode?",
    body: "Quick question — does the web app have a dark mode option? I've looked through settings but can't find one.",
    category: TicketCategory.general_question,
  },
  {
    subject: "OAuth token expiry too short",
    body: "Our OAuth access tokens seem to expire after 15 minutes causing frequent logouts. The docs say 1 hour. Is this a config issue?",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund for downgraded plan difference",
    body: "I downgraded from Pro to Basic mid-cycle. I'd like a pro-rata refund for the unused portion of the Pro plan.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Can I use my account on multiple devices?",
    body: "Am I allowed to be logged in on my laptop and phone at the same time, or is there a single-session limit?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Bulk delete not working",
    body: "Selecting all 200 items and clicking 'Delete' only removes the first 50. The rest remain and have to be deleted manually.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund — free trial charged",
    body: "I signed up for the free trial but was charged £29 on day one. I never provided card details for a paid plan.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "How long does onboarding take?",
    body: "We're a team of 15 and are planning to adopt your platform. Roughly how long does guided onboarding take and is it included?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Real-time updates stopped working",
    body: "The live feed on our dashboard stopped updating in real-time. We have to refresh the page to see new data. WebSocket issue?",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund for damaged goods — order #11730",
    body: "Items from order #11730 arrived with significant packaging damage and two units are broken. Requesting a full refund.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "How to integrate with Zapier?",
    body: "Is there official Zapier integration? I can see you're listed but the triggers don't seem to fire correctly in my zap.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Audit log missing entries",
    body: "Several admin actions from last week don't appear in the audit log. This is a compliance requirement for us — please investigate.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Refund for subscription — moved to competitor",
    body: "We've decided to move to a competitor. We're in month two of an annual plan and would like a pro-rata refund for the remaining months.",
    category: TicketCategory.refund_request,
  },
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number) {
  const now = new Date("2026-04-10T12:00:00Z");
  const ms = randomBetween(0, daysAgo * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - ms);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const data = tickets.map((t, i) => {
  const sender = senders[i % senders.length];
  const status = pick(statuses);
  return {
    fromEmail: sender.email,
    fromName: sender.name,
    subject: t.subject,
    body: t.body,
    status,
    category: t.category,
    createdAt: randomDate(90),
  };
});

await prisma.ticket.createMany({ data });
console.log(`Inserted ${data.length} test tickets.`);
await prisma.$disconnect();
