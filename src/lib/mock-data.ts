export type ClientStatus = "active" | "expiring" | "expired";

export interface Client {
  id: string;
  name: string;
  photo: string;
  package: string;
  packageAmount: number;
  amountPaid: number;
  joiningDate: string;
  expiryDate: string;
  daysLeft: number;
  totalDays: number;
  eligibleDays: number;
  freezeDays: number;
  attendancePct: number;
  status: ClientStatus;
  sessionTime?: string;
  present: number;
  absent: number;
  freeze: number;
}

const photos = [
  "https://i.pravatar.cc/120?img=12",
  "https://i.pravatar.cc/120?img=32",
  "https://i.pravatar.cc/120?img=47",
  "https://i.pravatar.cc/120?img=5",
  "https://i.pravatar.cc/120?img=68",
  "https://i.pravatar.cc/120?img=23",
  "https://i.pravatar.cc/120?img=14",
  "https://i.pravatar.cc/120?img=51",
  "https://i.pravatar.cc/120?img=33",
  "https://i.pravatar.cc/120?img=20",
];

export const clients: Client[] = [
  { id: "c1", name: "Aarav Mehta",     photo: photos[0], package: "Elite — 6 months", packageAmount: 36000, amountPaid: 36000, joiningDate: "2025-12-10", expiryDate: "2026-06-10", daysLeft: 9,  totalDays: 180, eligibleDays: 171, freezeDays: 4, attendancePct: 92, status: "expiring", sessionTime: "07:00 AM", present: 78, absent: 6,  freeze: 4 },
  { id: "c2", name: "Priya Sharma",    photo: photos[1], package: "Pro — 3 months",   packageAmount: 18000, amountPaid: 12000, joiningDate: "2026-03-01", expiryDate: "2026-06-01", daysLeft: 0,  totalDays: 90,  eligibleDays: 90,  freezeDays: 2, attendancePct: 64, status: "expired",  sessionTime: "08:30 AM", present: 48, absent: 22, freeze: 2 },
  { id: "c3", name: "Rohan Verma",     photo: photos[2], package: "Elite — 12 months",packageAmount: 60000, amountPaid: 60000, joiningDate: "2025-09-15", expiryDate: "2026-09-15", daysLeft: 106,totalDays: 365, eligibleDays: 360, freezeDays: 5, attendancePct: 88, status: "active",   sessionTime: "06:00 AM", present: 220,absent: 18, freeze: 5 },
  { id: "c4", name: "Ishita Kapoor",   photo: photos[3], package: "Pro — 6 months",   packageAmount: 30000, amountPaid: 25000, joiningDate: "2026-01-05", expiryDate: "2026-07-05", daysLeft: 34, totalDays: 180, eligibleDays: 178, freezeDays: 2, attendancePct: 81, status: "active",   sessionTime: "10:00 AM", present: 110,absent: 18, freeze: 2 },
  { id: "c5", name: "Karan Singh",     photo: photos[4], package: "Starter — 1 month",packageAmount: 7000,  amountPaid: 7000,  joiningDate: "2026-05-12", expiryDate: "2026-06-12", daysLeft: 11, totalDays: 30,  eligibleDays: 30,  freezeDays: 0, attendancePct: 95, status: "active",   sessionTime: "05:30 PM", present: 17, absent: 1,  freeze: 0 },
  { id: "c6", name: "Neha Iyer",       photo: photos[5], package: "Elite — 6 months", packageAmount: 36000, amountPaid: 30000, joiningDate: "2026-02-20", expiryDate: "2026-08-20", daysLeft: 80, totalDays: 180, eligibleDays: 177, freezeDays: 3, attendancePct: 73, status: "active",   sessionTime: "06:30 PM", present: 70, absent: 25, freeze: 3 },
  { id: "c7", name: "Vikram Rao",      photo: photos[6], package: "Pro — 3 months",   packageAmount: 18000, amountPaid: 18000, joiningDate: "2026-04-01", expiryDate: "2026-07-01", daysLeft: 30, totalDays: 90,  eligibleDays: 90,  freezeDays: 0, attendancePct: 86, status: "active",   sessionTime: "07:30 AM", present: 52, absent: 8,  freeze: 0 },
  { id: "c8", name: "Ananya Pillai",   photo: photos[7], package: "Elite — 6 months", packageAmount: 36000, amountPaid: 30000, joiningDate: "2025-12-22", expiryDate: "2026-06-22", daysLeft: 21, totalDays: 180, eligibleDays: 174, freezeDays: 6, attendancePct: 90, status: "expiring", sessionTime: "09:00 AM", present: 142,absent: 14, freeze: 6 },
  { id: "c9", name: "Devraj Nair",     photo: photos[8], package: "Pro — 6 months",   packageAmount: 30000, amountPaid: 30000, joiningDate: "2026-01-18", expiryDate: "2026-07-18", daysLeft: 47, totalDays: 180, eligibleDays: 179, freezeDays: 1, attendancePct: 79, status: "active",   present: 102,absent: 25, freeze: 1 },
  { id: "c10",name: "Meera Joshi",     photo: photos[9], package: "Starter — 1 month",packageAmount: 7000,  amountPaid: 5000,  joiningDate: "2026-05-20", expiryDate: "2026-06-20", daysLeft: 19, totalDays: 30,  eligibleDays: 30,  freezeDays: 0, attendancePct: 88, status: "active",   present: 9,  absent: 1,  freeze: 0 },
];

export const todaySessions = clients.filter((c) => c.sessionTime).slice(0, 6);

export const overviewStats = {
  totalClients: clients.length,
  activeClients: clients.filter((c) => c.status === "active").length,
  todaysSessions: todaySessions.length,
  monthlyIncentive: 48200,
  expiringMemberships: clients.filter((c) => c.status === "expiring").length,
  pendingPayments: clients.reduce((s, c) => s + (c.packageAmount - c.amountPaid), 0),
};

// Sparkline data
export const spark = (seed: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    x: i,
    y: Math.round(40 + Math.sin(i * 0.7 + seed) * 15 + (i * seed) % 13),
  }));

// Attendance calendar — current month
export type AttStatus = "present" | "absent" | "freeze" | "future" | "none";
export const buildCalendar = (): { day: number; status: AttStatus }[] => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = today.getDate();
  const pattern: AttStatus[] = ["present", "present", "present", "absent", "present", "freeze", "none"];
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    if (day > todayDay) return { day, status: "future" as AttStatus };
    return { day, status: pattern[i % pattern.length] };
  });
};

export const incentiveData = [
  { month: "Jan", value: 32000 },
  { month: "Feb", value: 38500 },
  { month: "Mar", value: 41000 },
  { month: "Apr", value: 36800 },
  { month: "May", value: 45200 },
  { month: "Jun", value: 48200 },
];

export const attendanceTrend = [
  { week: "W1", present: 22, absent: 3 },
  { week: "W2", present: 24, absent: 1 },
  { week: "W3", present: 20, absent: 5 },
  { week: "W4", present: 23, absent: 2 },
];

export const freezeHistory = [
  { id: 1, date: "2026-04-12", reason: "Medical leave", duration: "5 days" },
  { id: 2, date: "2026-02-22", reason: "Travel — work trip", duration: "3 days" },
  { id: 3, date: "2025-12-30", reason: "Family event", duration: "2 days" },
];

export const incentiveBreakdown = {
  total: 48200,
  perClient: 4820,
  revenue: 312000,
  renewals: 7,
};
