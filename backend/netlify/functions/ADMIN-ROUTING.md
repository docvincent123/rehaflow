# RehaFlow administration routing

`rehaflow-admin.ts` contains server-side administration endpoints for the native Windows console.

The existing `/api/baas` router must delegate `/admin/*` before its generic `404` or `/db/query` fallback, using the same authenticated `currentUser` object that is already passed to `handleMobileRoute`:

```ts
import { handleAdminRoute } from './rehaflow-admin';

const admin = await handleAdminRoute(event, currentUser);
if (admin) return admin;

const mobile = await handleMobileRoute(event, currentUser);
if (mobile) return mobile;
```

Do not accept a role from the Windows client. `handleAdminRoute` checks the server-side session user and returns `401/403` for unauthorized operations.

Endpoints:

- `GET /api/baas/admin/permissions`
- `GET /api/baas/admin/staff`
- `PATCH /api/baas/admin/staff/:id`
- `GET /api/baas/admin/rooms`
- `GET /api/baas/admin/beds`
- `GET /api/baas/admin/archive/patients`
- `POST /api/baas/admin/archive/patient`
- `GET /api/baas/admin/shifts`
- `GET /api/baas/admin/audit`

Run `backend/sql/admin-schema.sql` once against Turso before using the permissions/archive extensions.
