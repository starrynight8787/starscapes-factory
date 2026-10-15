// What a sync would change, shown in plain words before anything is touched.
export default function SyncPlan({ plan, onApply, onCancel }) {
  const names = (list, label) => list.map((x) => label(x))
  return (
    <div className="al-sync-plan">
      <p>
        <strong>{plan.prints} {plan.prints === 1 ? 'print' : 'prints'} at Creative Hub.</strong> {plan.upToDate.length} already {plan.upToDate.length === 1 ? 'matches' : 'match'}.
      </p>

      {!plan.hasChanges && <p>Everything already matches Creative Hub. There is nothing to do.</p>}

      {plan.refresh.length > 0 && (
        <section aria-label="Will be refreshed">
          <h3>Will be refreshed ({plan.refresh.length})</h3>
          <ul>{names(plan.refresh, (r) => <li key={r.shop.id}>{r.ch.name}: {r.reasons.join(', ')}</li>)}</ul>
        </section>
      )}

      {plan.replace.length > 0 && (
        <section aria-label="Re-created at Creative Hub">
          <h3>Re-created at Creative Hub ({plan.replace.length})</h3>
          <p className="al-sync-plan__note">These are the same prints under new Creative Hub ids. Your collection and live status are kept.</p>
          <ul>{names(plan.replace, (r) => <li key={r.shop.id}>{r.ch.name}</li>)}</ul>
        </section>
      )}

      {plan.add.length > 0 && (
        <section aria-label="New at Creative Hub">
          <h3>New at Creative Hub ({plan.add.length})</h3>
          <p className="al-sync-plan__note">Added as drafts, with no collection. Place them and switch them on when you are ready.</p>
          <ul>{names(plan.add, (a) => <li key={a.ch.id}>{a.ch.name}</li>)}</ul>
        </section>
      )}

      {plan.gone.length > 0 && (
        <section aria-label="No longer at Creative Hub">
          <h3>No longer at Creative Hub ({plan.gone.length})</h3>
          <p className="al-sync-plan__note">Nothing that is live is ever deleted: a live print is hidden, and only a draft is removed.</p>
          <ul>{names(plan.gone, (g) => <li key={g.shop.id}>{g.shop.title} ({g.hide ? 'live, will be hidden' : 'draft, will be removed'})</li>)}</ul>
        </section>
      )}

      <div className="al-sync-plan__buttons">
        {plan.hasChanges && <button type="button" onClick={onApply}>Apply these changes</button>}
        <button type="button" className="is-quiet" onClick={onCancel}>{plan.hasChanges ? 'Cancel' : 'Close'}</button>
      </div>
    </div>
  )
}
