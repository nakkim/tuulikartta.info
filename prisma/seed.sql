-- Prisma seed data for the notifications table.
-- Run with `npm run db:seed` (or `npx prisma db seed`).
--
-- Resets the table to a known, reproducible set of rows covering the
-- cases the banner logic needs to handle: an active notification with a
-- link, an active alert, one that's already expired, and one scheduled
-- to start in the future - so both "what a visitor sees" and the
-- active/expired/scheduled filtering in dataMiner.php can be exercised
-- right after seeding.

TRUNCATE notifications RESTART IDENTITY;

INSERT INTO notifications (text_fi, text_en, type, link, starts_at, expires_at) VALUES
  (
    'Uusi ominaisuus: tuulen konvergenssi ja divergenssi voidaan nyt näyttää kartalla.',
    'New feature: wind convergence and divergence can now be shown on the map.',
    'notification',
    'https://tuulikartta.info/tietoa-sivustosta/',
    NULL,
    NOW() + interval '14 days'
  ),
  (
    'Tutkakuvien palvelussa saattaa esiintyä tilapäisiä katkoja huoltotöiden vuoksi.',
    'The radar imagery service may experience temporary outages due to maintenance.',
    'alert',
    NULL,
    NULL,
    NOW() + interval '2 days'
  ),
  (
    'Tämä viesti on jo vanhentunut eikä sen pitäisi näkyä.',
    'This message has already expired and should not be shown.',
    'notification',
    NULL,
    NULL,
    NOW() - interval '1 day'
  ),
  (
    'Tuleva ilmoitus, joka näkyy vasta huomenna.',
    'An upcoming announcement, visible only from tomorrow.',
    'notification',
    NULL,
    NOW() + interval '1 day',
    NOW() + interval '10 days'
  );
