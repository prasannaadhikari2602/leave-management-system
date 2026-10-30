# Leave Portal — Leave Management System

Django REST Framework + PostgreSQL backend (service/repository pattern) and a React + TypeScript frontend
(Redux Toolkit, RTK Query, React Hook Form, Zod, Tailwind CSS, react-icons).

Roles: **Admin / HR Manager**, **Manager**, **Employee**. Leave requests go to the employee's
*reporting manager* (not automatically to Admin). HR staff report to the HR Admin.

## 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create the PostgreSQL database/user, then edit .env.development (DB_PASSWORD etc.)
python manage.py migrate
python manage.py seed_demo          # demo departments, leave rules and users (optional)
# or create your own first admin:  python manage.py createsuperuser
python manage.py runserver
```

No PostgreSQL handy? Set `DB_ENGINE=sqlite` in `.env.development` to try it out.
API docs (development): http://127.0.0.1:8000/api/docs/ · Tests: `python manage.py test`

Demo logins (password `Leave@12345`): `anita@company.test` (admin/HR), `ram@company.test` and
`maya@company.test` (managers), `sita@`, `gita@`, `hari@`, `bikash@company.test` (employees).

Emails (invitations, password reset): with no SMTP login configured they print to the Django
console. Set `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` (Brevo) to send real mail.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api to http://127.0.0.1:8000)
npm run build        # production build in dist/
```

## Business rules implemented

* Admin creates departments, leave types, leave rules, managers and employees (with a reporting manager).
* New users get an invitation email and set their own password; the same link flow powers "forgot password".
* Apply leave validates dates, max consecutive days, half days, overlap and balance
  (pending requests count against the available balance).
* Requests route to the reporting manager; managers fall back to an admin; nobody can review their own request;
  an Admin only approves requests assigned to them (HR staff + managers) — the company-wide list is read-only.
* Balance is deducted on approval and restored if approved leave is cancelled before it starts.
* Every action is written to `leave_request_history`; notifications (in-app, optional email) go to the right people.
* Changing a user's reporting manager re-routes their pending requests.
* Reports, CSV export, company/team/personal calendars, company settings.

