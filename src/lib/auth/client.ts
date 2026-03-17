export const authClient = {
  useSession: () => ({
    data: { user: { id: "mock-user", name: "Demo User", email: "demo@example.com", role: "user" } },
    isPending: false,
  }),
};
