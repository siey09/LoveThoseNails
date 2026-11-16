# Security Specification — Love Those Nails by Eshin

## 1. Data Invariants
1. **Identity Integrity**: Clients may only create `appointments`, `retailOrders`, `bookedSlots`, and `users/{uid}/private/profile` documents where `clientId` / `uid` equals `request.auth.uid` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: No email, phone number, client name, or allergy notes may exist in public collections (`services`, `artists`, `retailProducts`, `bookedSlots`). Client PII lives strictly in `users/{uid}/private/profile`, `appointments`, and `retailOrders`, all gated by `isOwner || isAdmin()`.
3. **Slot Atomicity**: An `appointments/{appointmentId}` creation MUST be accompanied by `bookedSlots/{appointmentId}` in the same atomic batch (`existsAfter`), referencing an existing active `services/{serviceId}` and `artists/{artistId}`.
4. **Privilege Escalation Prevention**: Clients cannot self-assign `admins/{uid}`, mutate `services`, `artists`, `retailProducts`, `posTransactions`, or inflate `loyaltyPoints` on their profile.
5. **Terminal State Locking**: Once an appointment is `'completed'` or `'cancelled'`, or an order is `'picked_up'` or `'cancelled'`, non-admins cannot mutate the document.
6. **Temporal & Volumetric Bounds**: All `createdAt`/`updatedAt` timestamps must match `request.time`; all string/array fields have explicit `.size()` and pattern constraints.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Appointment Create**: `{ ..., isAdmin: true }` -> DENIED (`keys().hasOnly` rejects extra keys).
2. **Identity Spoofing on Appointment Create**: `{ clientId: "victim-uid", ... }` signed in as attacker -> DENIED (`incoming().clientId == request.auth.uid`).
3. **Unverified Email Spoofing Admin**: Token with `email: "sieyiphone07@gmail.com"`, `email_verified: false` -> DENIED (`email_verified == true` enforced).
4. **Orphaned Appointment Without Slot Lock**: Creating `/appointments/appt_1` without `/bookedSlots/appt_1` -> DENIED (`existsAfter` check fails).
5. **Orphaned Appointment With Fake Service**: Creating appointment with `serviceId: "nonexistent"` -> DENIED (`exists(/services/...)` fails).
6. **Client Price/Status Tampering on Create**: Creating appointment with `status: "completed"` or `paymentStatus: "paid"` -> DENIED (`status == 'pending' && paymentStatus == 'unpaid'`).
7. **Client Loyalty Point Inflation**: Client updating `users/{uid}/private/profile` with `loyaltyPoints: 9999` -> DENIED (`affectedKeys().hasOnly` excludes `loyaltyPoints` for non-admin).
8. **Post-Terminal Mutation**: Client changing a `'cancelled'` appointment back to `'confirmed'` -> DENIED (terminal state lock + client can only cancel).
9. **ID Poisoning**: Creating `/appointments/invalid$id!!` or 1.5KB ID -> DENIED (`isValidId()` regex + length <= 128).
10. **PII Cross-Read**: User A reading User B's `/appointments/{id}` or `/users/userB/private/profile` -> DENIED (`isOwner || isAdmin()`).
11. **Unscoped List Query**: User querying `/appointments` without `where('clientId', '==', uid)` -> DENIED (`allow list` inspects `resource.data.clientId == request.auth.uid || isAdmin()`).
12. **Client Writing POS Ledger**: Non-admin writing `/posTransactions/tx_1` -> DENIED (`isAdmin()` strictly required).
