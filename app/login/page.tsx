import { bootstrapAction, loginAction } from "@/app/actions";

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

      {sp.error && (
        <div className="mb-4 p-2 border border-red-800 bg-red-950/40 text-sm text-red-300 rounded">
          {decodeURIComponent(sp.error)}
        </div>
      )}

      {bootstrapMode ? (
        <form action={bootstrapAction} className="space-y-3">
          <Field name="organisation_name" label="Organisation name" required />
          <Field name="full_name" label="Your full name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="position" label="Position (optional)" />
          <Field name="password" label="Password" type="password" required />
          <button className="w-full bg-white text-black font-semibold rounded px-3 py-2 hover:bg-neutral-200">
            Create organisation
          </button>
          <a href="/login" className="text-xs text-neutral-400 hover:underline block text-center">
            ← Back to sign in
          </a>
        </form>
      ) : (
        <form action={loginAction} className="space-y-3">
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
          <button className="w-full bg-white text-black font-semibold rounded px-3 py-2 hover:bg-neutral-200">
            Sign in
          </button>
          <a
            href="/login?bootstrap=1"
            className="text-xs text-neutral-400 hover:underline block text-center"
          >
            First time setup? Bootstrap the first admin →
          </a>
        </form>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-neutral-400">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
      />
    </div>
  );
}
