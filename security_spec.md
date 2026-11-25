# Security Specification — VoxForge Firestore Rules

## 1. Data Invariants
1. User profile documents live exclusively at `/users/{userId}` where `userId` strictly matches `request.auth.uid`.
2. Unauthenticated requests are denied all read and write access across the entire database.
3. No user may read, list, create, update, or delete another user's profile document (`/users/{otherId}`).
4. Collection listing (`list`) on `/users` is disabled (`false`) to prevent email/account enumeration.
5. Passwords, secrets, and arbitrary shadow fields (`role`, `isAdmin`, `emailVerified`, etc.) are strictly forbidden by `hasOnly(['uid', 'fullName', 'email', 'createdAt'])`.
6. `uid` and `createdAt` are immutable after creation; `createdAt` on creation must equal `request.time`.

## 2. Adversarial "Dirty Dozen" Payloads
1. Unauthenticated `get` on `/users/user_123` -> `PERMISSION_DENIED`.
2. Authenticated user A attempting `get` on `/users/user_B` -> `PERMISSION_DENIED`.
3. Authenticated user attempting `list` query on `/users` -> `PERMISSION_DENIED`.
4. User A creating `/users/user_A` with `uid: "user_B"` (UID spoofing) -> `PERMISSION_DENIED`.
5. User A creating `/users/user_B` with `uid: "user_A"` (cross-path write) -> `PERMISSION_DENIED`.
6. User A creating `/users/user_A` with extra shadow field `isAdmin: true` -> `PERMISSION_DENIED`.
7. User A creating `/users/user_A` with a password field `passwordHash: "abc"` -> `PERMISSION_DENIED`.
8. User A creating `/users/user_A` with client-forged past `createdAt` timestamp instead of `request.time` -> `PERMISSION_DENIED`.
9. User A creating `/users/user_A` with oversized `fullName` (> 100 chars) or oversized `email` (> 254 chars) -> `PERMISSION_DENIED`.
10. User A updating `/users/user_A` to mutate `createdAt` or `uid` -> `PERMISSION_DENIED`.
11. User A updating `/users/user_A` to spoof an `email` not matching `request.auth.token.email` -> `PERMISSION_DENIED`.
12. Creating `/users/bad$id!` with invalid path characters -> `PERMISSION_DENIED`.
