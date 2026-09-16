import { useEffect, useState } from 'react';

import { fetchAllActiveProperties } from '../api/properties';
import { fetchPricingProfile, savePricingProfile, type SeasonalPricingRule } from '../api/calendar';

const emptyRule = (): SeasonalPricingRule => ({
  name: '', start_date: '', end_date: '', nightly_rate: '', minimum_nights: null,
});

export function PricingManagementPanel() {
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);
  const [propertyId, setPropertyId] = useState('');
  const [base, setBase] = useState('');
  const [weekend, setWeekend] = useState('0');
  const [minimum, setMinimum] = useState('1');
  const [rules, setRules] = useState<SeasonalPricingRule[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchAllActiveProperties().then(setProperties)
      .catch(() => setMessage('Properties could not be loaded. Try again from Settings.'))
      .finally(() => setIsLoadingProperties(false));
  }, []);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setIsLoadingProfile(true);
    setMessage(null);
    void fetchPricingProfile(propertyId).then((profile) => {
      if (cancelled) return;
      setBase(String(profile.base_nightly_rate));
      setWeekend(String(profile.weekend_adjustment_percent));
      setMinimum(String(profile.minimum_nights));
      setRules(profile.seasonal_rules);
    }).catch(() => {
      if (cancelled) return;
      setBase(''); setWeekend('0'); setMinimum('1'); setRules([]);
      setMessage('No pricing profile exists yet. Enter values below and save one.');
    }).finally(() => { if (!cancelled) setIsLoadingProfile(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  const changeRule = (index: number, field: keyof SeasonalPricingRule, value: string) => {
    setRules((current) => current.map((rule, ruleIndex) => (
      ruleIndex === index
        ? { ...rule, [field]: field === 'minimum_nights' ? (value ? Number(value) : null) : value }
        : rule
    )));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!propertyId) return;
    setIsSaving(true); setMessage(null);
    try {
      await savePricingProfile(propertyId, {
        base_nightly_rate: Number(base), weekend_adjustment_percent: Number(weekend), minimum_nights: Number(minimum),
        seasonal_rules: rules.map(({ name, start_date, end_date, nightly_rate, minimum_nights }) => ({ name, start_date, end_date, nightly_rate: Number(nightly_rate), minimum_nights })),
      });
      setMessage('Pricing profile saved. Staff must approve a current recommendation before saving a direct booking.');
    } catch {
      setMessage('Pricing profile could not be saved. Check each seasonal rule and try again.');
    } finally { setIsSaving(false); }
  };

  return <section className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm" aria-labelledby="pricing-heading">
    <h2 id="pricing-heading" className="font-bold text-[#1C1B18]">Direct-booking pricing</h2>
    <p className="mt-1 text-xs text-[#78716C]">Recommendations only. No channel prices are published.</p>
    {isLoadingProperties ? <p className="mt-4 text-sm text-[#57534E]">Loading properties…</p> : properties.length === 0 ? <p className="mt-4 text-sm text-[#57534E]">Create an active property before configuring its prices.</p> : <form onSubmit={save} className="mt-4 space-y-4">
      <label className="block text-xs font-semibold text-[#3B3735]">Property
        <select aria-label="Pricing property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D6D3D1] p-2 text-sm"><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>
      </label>
      {propertyId && isLoadingProfile ? <p className="text-sm text-[#57534E]">Loading pricing profile…</p> : propertyId && <>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-[#3B3735]">Base nightly rate<input required type="number" min="0" step="0.001" value={base} onChange={(event) => setBase(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D6D3D1] p-2 font-normal" /></label>
          <label className="text-xs font-semibold text-[#3B3735]">Friday/Saturday adjustment %<input required type="number" min="-100" step="0.01" value={weekend} onChange={(event) => setWeekend(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D6D3D1] p-2 font-normal" /></label>
          <label className="text-xs font-semibold text-[#3B3735]">Minimum nights<input required type="number" min="1" step="1" value={minimum} onChange={(event) => setMinimum(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D6D3D1] p-2 font-normal" /></label>
        </div>
        <div className="rounded-xl border border-[#EBE6DD] p-3">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#3B3735]">Seasonal overrides</p><button type="button" onClick={() => setRules((current) => [...current, emptyRule()])} className="rounded-lg border border-[#1E517B] px-2.5 py-1.5 text-xs font-bold text-[#1E517B]">Add season</button></div>
          {rules.length === 0 ? <p className="mt-2 text-xs text-[#78716C]">No seasonal overrides. The base rate applies every day.</p> : <div className="mt-3 space-y-3">{rules.map((rule, index) => <div key={rule.id ?? `new-${index}`} className="grid gap-2 rounded-lg bg-[#FAF8F5] p-2 sm:grid-cols-6"><label className="text-[11px]">Name<input required value={rule.name} onChange={(event) => changeRule(index, 'name', event.target.value)} className="mt-1 w-full rounded border p-1 text-xs" /></label><label className="text-[11px]">Start<input required type="date" value={rule.start_date} onChange={(event) => changeRule(index, 'start_date', event.target.value)} className="mt-1 w-full rounded border p-1 text-xs" /></label><label className="text-[11px]">End<input required type="date" value={rule.end_date} onChange={(event) => changeRule(index, 'end_date', event.target.value)} className="mt-1 w-full rounded border p-1 text-xs" /></label><label className="text-[11px]">Nightly rate<input required type="number" min="0" step="0.001" value={rule.nightly_rate} onChange={(event) => changeRule(index, 'nightly_rate', event.target.value)} className="mt-1 w-full rounded border p-1 text-xs" /></label><label className="text-[11px]">Min. nights<input type="number" min="1" value={rule.minimum_nights ?? ''} onChange={(event) => changeRule(index, 'minimum_nights', event.target.value)} className="mt-1 w-full rounded border p-1 text-xs" /></label><button type="button" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))} className="self-end rounded border border-[#B45309] px-2 py-1.5 text-xs font-bold text-[#B45309]">Remove</button></div>)}</div>}
        </div>
        <button disabled={isSaving} className="rounded-lg bg-[#0F3D5E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isSaving ? 'Saving…' : 'Save pricing'}</button>
      </>}
      {message && <p role="status" className="text-xs text-[#57534E]">{message}</p>}
    </form>}
  </section>;
}
