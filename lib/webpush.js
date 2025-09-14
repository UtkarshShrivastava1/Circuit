import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL || "admin@example.com"}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default webpush;
