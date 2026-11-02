# Smart School ERP

One system for the whole school office — admissions, fees, attendance, results, and parent updates.

**Live demo:** [smart-school-erp-rpl6.vercel.app](https://smart-school-erp-rpl6.vercel.app)

---

## What it does

| Module | Features |
|--------|----------|
| **Admissions** | Enquiry to admission, auto numbers |
| **Students** | One searchable record per student |
| **Attendance** | Daily by class/section (mark absents only) |
| **Fees** | Collect, print receipts, track pending |
| **Marks & Results** | Class marks entry, report cards, pass % / toppers |
| **Notices** | School updates on dashboards |
| **Parent portal** | Child attendance, marks, fees via mobile login |
| **Staff roles** | Principal, Accountant, Teacher — each sees only what they need |

---

## Who it’s for

- School principals and office staff
- Accountants handling fee collection
- Teachers marking attendance and results
- Parents checking their child’s updates

---

## Tech stack

- **Frontend / App:** Next.js
- **Deploy:** Vercel
- **Auth & roles:** Staff login + parent login
- **Data workflows:** Excel import for students/marks

---

## Getting started (local)

```bash
npm install
npm run dev
