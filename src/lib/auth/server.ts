export async function getSession() {
  return { user: { id: "mock-user", name: "Demo User", email: "demo@example.com", role: "user" } };
}
