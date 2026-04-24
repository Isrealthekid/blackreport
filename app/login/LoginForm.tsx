"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bootstrapAction, loginAction } from "@/app/actions";
import {
  bootstrapSchema,
  loginSchema,
  type BootstrapInput,
  type LoginInput,
} from "@/lib/forms/schemas";

export default function LoginForm({
  bootstrapMode,
  serverError,
}: {
  bootstrapMode: boolean;
  serverError?: string;
}) {
  return bootstrapMode ? (
    <BootstrapVariant serverError={serverError} />
  ) : (
    <LoginVariant serverError={serverError} />
  );
}

function LoginVariant({ serverError }: { serverError?: string }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    startTransition(async () => {
      try {
        await loginAction(fd);
      } catch {
        /* server action redirects; failures land on /login?error= */
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {serverError && (
        <div className="mb-2 p-2 border border-red-800 bg-red-950/40 text-sm text-red-300 rounded">
          {decodeURIComponent(serverError)}
        </div>
      )}
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        register={register("email")}
        error={errors.email?.message}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        register={register("password")}
        error={errors.password?.message}
      />
      <button
        disabled={isSubmitting || pending}
        className="w-full bg-white text-black font-semibold rounded px-3 py-2 hover:bg-neutral-200 disabled:opacity-60"
      >
        {isSubmitting || pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function BootstrapVariant({ serverError }: { serverError?: string }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapInput>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: {
      organisation_name: "",
      full_name: "",
      email: "",
      position: "",
      password: "",
    },
  });

  const onSubmit = (values: BootstrapInput) => {
    const fd = new FormData();
    fd.set("organisation_name", values.organisation_name);
    fd.set("full_name", values.full_name);
    fd.set("email", values.email);
    if (values.position) fd.set("position", values.position);
    fd.set("password", values.password);
    startTransition(async () => {
      try {
        await bootstrapAction(fd);
      } catch {
        /* redirected on success */
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {serverError && (
        <div className="mb-2 p-2 border border-red-800 bg-red-950/40 text-sm text-red-300 rounded">
          {decodeURIComponent(serverError)}
        </div>
      )}
      <Field
        label="Organisation name"
        register={register("organisation_name")}
        error={errors.organisation_name?.message}
      />
      <Field
        label="Your full name"
        register={register("full_name")}
        error={errors.full_name?.message}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        register={register("email")}
        error={errors.email?.message}
      />
      <Field label="Position (optional)" register={register("position")} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        register={register("password")}
        error={errors.password?.message}
      />
      <button
        disabled={isSubmitting || pending}
        className="w-full bg-white text-black font-semibold rounded px-3 py-2 hover:bg-neutral-200 disabled:opacity-60"
      >
        {isSubmitting || pending ? "Creating…" : "Create organisation"}
      </button>
      <a
        href="/login"
        className="text-xs text-neutral-400 hover:underline block text-center"
      >
        ← Back to sign in
      </a>
    </form>
  );
}

function Field({
  label,
  type = "text",
  autoComplete,
  register,
  error,
}: {
  label: string;
  type?: string;
  autoComplete?: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm text-neutral-400">{label}</label>
      <input
        {...register}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
