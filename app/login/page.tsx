import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; bootstrap?: string }>;
}) {
  const sp = await searchParams;
  const bootstrapMode = sp.bootstrap === "1";

  return (
    <div className="max-w-md mx-auto pt-12">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold">◼ Black Report</div>
      </div>

      <h1 className="text-2xl font-bold mb-1">
        {bootstrapMode ? "Bootstrap organisation" : "Sign in"}
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        {bootstrapMode
          ? "Create the first admin user for a brand-new instance."
          : "Sign in with your organisation account."}
      </p>

      <LoginForm bootstrapMode={bootstrapMode} serverError={sp.error} />
    </div>
  );
}
