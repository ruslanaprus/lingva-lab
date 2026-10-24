import { t, localeTag } from "../i18n/index.js";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const pad = (n) => String(n).padStart(2, "0");
export const labels = {
  retired: "Вилучено з поточного маршруту",
  new: t("status.new"),
  passed: t("status.passed"),
  failed: t("status.failed"),
  submitted: t("status.submitted"),
};
export const date = (value) => new Date(value).toLocaleString(localeTag());
