import { requireAdmin, getOrganisation } from "@/lib/auth";
import { updateOrganisationAction } from "@/app/actions";

const TIMEZONES = [
  "UTC",
  "Africa/Lagos",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
];

export default async function OrganisationPage() {
  await requireAdmin();
  const org = await getOrganisation();

  if (!org) {
    return <div className="text-neutral-400">Could not load organisation.</div>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Organisation</h1>
      <p className="text-sm text-neutral-400 mt-1">Global settings for your organisation.</p>

      <form action={updateOrganisationAction} className="mt-6 space-y-5">
        <div>
          <label className="text-sm text-neutral-400">Name</label>
          <input
            name="name"
            defaultValue={org.name}
            required
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Logo URL</label>
          <input
            name="logo_url"
            defaultValue={org.logo_url ?? ""}
            placeholder="https://…"
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-400">Timezone</label>
            <select
              name="timezone"
              defaultValue={org.timezone}
              className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400">Locale</label>
            <select
              name="locale"
              defaultValue={org.locale}
              className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Retention policy (years)</label>
          <input
            type="number"
            name="retention_years"
            defaultValue={org.retention_years}
            min={1}
            max={20}
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </div>
        <button className="px-4 py-2 bg-white text-black font-medium rounded">Save</button>
      </form>
    </div>
  );
}
