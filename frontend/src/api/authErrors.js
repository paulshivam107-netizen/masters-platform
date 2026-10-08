// Validation responses contain objects (and may echo sensitive input). Keep them
// out of rendered JSX and display only known field labels.
export function authError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const labels = {
      email: "email address",
      name: "name",
      password: "password",
      new_password: "new password",
      token: "reset link",
    };
    const fields = [
      ...new Set(
        detail
          .map((item) => labels[item?.loc?.[item.loc.length - 1]])
          .filter(Boolean),
      ),
    ];
    return `Check your ${fields.length ? fields.join(" and ") : "details"}, then try again.`;
  }
  return typeof detail === "string" ? detail : fallback;
}
