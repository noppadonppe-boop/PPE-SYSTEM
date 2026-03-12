import React, { useRef } from 'react'
import { X, Printer, FileDown } from 'lucide-react'

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

export default function QuotationPreview({ rfq, directRows, indirectRows, overheadPct, totalDirect, totalIndirect, grandTotal, onClose }) {
  const printRef = useRef()

  const overheadAmt = +((totalDirect + totalIndirect) * (overheadPct / 100)).toFixed(2)
  const vatAmt      = +(grandTotal * 0.07).toFixed(2)
  const totalIncVat = +(grandTotal + vatAmt).toFixed(2)

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank', 'width=900,height=1200')
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Quotation — ${rfq.requestWorkNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 16mm 12mm 16mm; }
        @media print {
          body { margin: 0; }
          .page { width: 210mm; padding: 14mm 14mm 10mm 14mm; box-shadow: none; }
        }
      </style>
    </head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      {/* Toolbar */}
      <div className="fixed top-4 right-4 z-[61] flex gap-2">
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition-colors">
          <Printer size={15} /> Print / Save PDF
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-xl shadow-lg transition-colors">
          <X size={15} /> Close
        </button>
      </div>

      {/* A4 Paper */}
      <div ref={printRef}
        className="page bg-white shadow-2xl rounded-sm"
        style={{ width: '210mm', minHeight: '297mm', padding: '16mm 16mm 12mm 16mm', fontFamily: "'Inter', sans-serif", color: '#1e293b' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e3a5f', paddingBottom: '12px', marginBottom: '18px' }}>
          {/* Left: Logo area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '48px', height: '48px', background: '#1e3a5f', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: '900', fontSize: '18px', letterSpacing: '-1px' }}>PPE</span>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.5px', lineHeight: 1.1 }}>PPE Engineering</div>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Plant & Process Engineering</div>
              </div>
            </div>
            <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.6' }}>
              123 Engineering Tower, Bangkok 10110, Thailand<br/>
              Tel: +66 2 000 0000 &nbsp;|&nbsp; Email: info@ppe-eng.com<br/>
              www.ppe-eng.com
            </div>
          </div>
          {/* Right: Document info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.5px' }}>QUOTATION</div>
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '8px 12px', marginTop: '6px', minWidth: '180px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '8.5px' }}>
                <span style={{ color: '#64748b' }}>Quotation No.</span>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{rfq.requestWorkNo}</span>
                <span style={{ color: '#64748b' }}>MHE No.</span>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{rfq.mheNo || '—'}</span>
                <span style={{ color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{today()}</span>
                <span style={{ color: '#64748b' }}>Valid Until</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{rfq.dateCompletion || '30 days'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BILL TO / PROJECT INFO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '8px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Bill To</div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>{rfq.requestor || rfq.client || '—'}</div>
            {rfq.client && rfq.client !== rfq.requestor && (
              <div style={{ fontSize: '9.5px', color: '#475569', marginBottom: '2px' }}>{rfq.client}</div>
            )}
            {rfq.emailRequestor && <div style={{ fontSize: '9px', color: '#64748b' }}>✉ {rfq.emailRequestor}</div>}
            {rfq.tel           && <div style={{ fontSize: '9px', color: '#64748b' }}>☎ {rfq.tel}</div>}
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '8px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Project Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontSize: '9px' }}>
              <span style={{ color: '#64748b' }}>Project No.</span>
              <span style={{ fontWeight: '600' }}>{rfq.projectNo || '—'}</span>
              <span style={{ color: '#64748b' }}>Service Type</span>
              <span style={{ fontWeight: '600' }}>{rfq.serviceType || rfq.type || '—'}</span>
              <span style={{ color: '#64748b' }}>Date Requested</span>
              <span style={{ fontWeight: '600' }}>{rfq.dateRequest || '—'}</span>
              <span style={{ color: '#64748b' }}>Start Date</span>
              <span style={{ fontWeight: '600' }}>{rfq.dateStart || '—'}</span>
              <span style={{ color: '#64748b' }}>Completion</span>
              <span style={{ fontWeight: '600' }}>{rfq.dateCompletion || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── SCOPE OF WORK ── */}
        {rfq.details && (
          <div style={{ marginBottom: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '8px', fontWeight: '700', color: '#1d4ed8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Scope of Work</div>
            <div style={{ fontSize: '9.5px', color: '#1e3a5f', lineHeight: '1.6' }}>{rfq.details}</div>
          </div>
        )}

        {/* ── TABLE A: DIRECT COST ── */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '3px', height: '14px', background: '#1e3a5f', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#1e3a5f', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Table A — Direct Cost (Engineering Services)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '28px', fontWeight: '600' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600' }}>Activity / Description</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', width: '70px' }}>Type</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '35px' }}>Qty</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '42px' }}>Unit MH</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '50px' }}>Total MH</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '64px' }}>Rate (THB)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '72px' }}>Amount (THB)</th>
              </tr>
            </thead>
            <tbody>
              {directRows.map((r, i) => (
                <tr key={r.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>{String(i+1).padStart(2,'0')}</td>
                  <td style={{ padding: '5px 8px', fontWeight: '500' }}>{r.activityName || r.task || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{r.type || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569' }}>{r.qty || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569' }}>{r.unitMH || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600' }}>{r.totalMH || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569' }}>{r.rate ? fmt(r.rate) : '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: '#1e3a5f' }}>{r.totalCost ? fmt(r.totalCost) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#e0e7ff', borderTop: '2px solid #6366f1' }}>
                <td colSpan={7} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', fontSize: '9.5px', color: '#1e3a5f' }}>Total Direct Cost (Table A)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', fontSize: '10px', color: '#1e3a5f' }}>{fmt(totalDirect)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── TABLE B: INDIRECT COST ── */}
        {indirectRows.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '3px', height: '14px', background: '#7c3aed', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#7c3aed', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Table B — Indirect Cost</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ background: '#6d28d9', color: '#fff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: '28px', fontWeight: '600' }}>Item</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', width: '55px' }}>Unit</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '64px' }}>Rate (THB)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '40px' }}>Qty</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', width: '80px' }}>Amount (THB)</th>
                </tr>
              </thead>
              <tbody>
                {indirectRows.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>{String(i+1).padStart(2,'0')}</td>
                    <td style={{ padding: '5px 8px', fontWeight: '500' }}>{r.description || '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{r.unit || '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569' }}>{r.rate ? fmt(r.rate) : '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569' }}>{r.qty || '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: '#4c1d95' }}>{r.amount ? fmt(r.amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#ede9fe', borderTop: '2px solid #7c3aed' }}>
                  <td colSpan={5} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', fontSize: '9.5px', color: '#4c1d95' }}>Total Indirect Cost (Table B)</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', fontSize: '10px', color: '#4c1d95' }}>{fmt(totalIndirect)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── TABLE B3.3: COST SUMMARY ── */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '3px', height: '14px', background: '#d97706', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Table B3.3 — Cost Summary</span>
          </div>
          <div style={{ border: '1px solid #fcd34d', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #fde68a' }}>
                  <td style={{ padding: '7px 12px', color: '#78350f' }}>Total Direct Cost (Table A)</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>{fmt(totalDirect)} Baht</td>
                </tr>
                <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                  <td style={{ padding: '7px 12px', color: '#78350f' }}>Total Indirect Cost (Table B)</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>{fmt(totalIndirect)} Baht</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #fde68a' }}>
                  <td style={{ padding: '7px 12px', color: '#78350f' }}>Total (A + B)</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>{fmt(totalDirect + totalIndirect)} Baht</td>
                </tr>
                <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
                  <td style={{ padding: '7px 12px', color: '#92400e' }}>Overhead + Profit ({overheadPct}%)</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: '700', color: '#b45309' }}>{fmt(overheadAmt)} Baht</td>
                </tr>
                <tr style={{ background: '#1e3a5f' }}>
                  <td style={{ padding: '9px 12px', fontWeight: '800', fontSize: '11px', color: '#fff' }}>Grand Total (excl. VAT 7%)</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '900', fontSize: '13px', color: '#fbbf24' }}>{fmt(grandTotal)} Baht</td>
                </tr>
                <tr style={{ background: '#f0f9ff', borderTop: '1px dashed #bae6fd' }}>
                  <td style={{ padding: '6px 12px', color: '#0369a1', fontSize: '9px' }}>VAT 7%</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0369a1', fontWeight: '600', fontSize: '9px' }}>{fmt(vatAmt)} Baht</td>
                </tr>
                <tr style={{ background: '#0c4a6e' }}>
                  <td style={{ padding: '9px 12px', fontWeight: '800', fontSize: '11px', color: '#fff' }}>Total (incl. VAT 7%)</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '900', fontSize: '13px', color: '#7dd3fc' }}>{fmt(totalIncVat)} Baht</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── NOTES / TERMS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '8px', fontWeight: '700', color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Terms & Conditions</div>
            <ul style={{ fontSize: '8.5px', color: '#374151', paddingLeft: '14px', lineHeight: '1.8', margin: 0 }}>
              <li>Quotation valid for 30 days from date of issue</li>
              <li>Payment terms: 30% advance, 70% upon delivery</li>
              <li>Price excludes VAT 7% unless stated</li>
              <li>Scope changes may require revised quotation</li>
              <li>This quotation is subject to PPE standard T&C</li>
            </ul>
          </div>
          <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '8px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Authorized Signature</div>
            <div style={{ marginBottom: '28px' }}></div>
            <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1e3a5f' }}>PPE Engineering Co., Ltd.</div>
              <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>Authorized Representative</div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '7.5px', color: '#94a3b8' }}>
            PPE Engineering Co., Ltd. &nbsp;|&nbsp; 123 Engineering Tower, Bangkok 10110
          </div>
          <div style={{ fontSize: '7.5px', color: '#94a3b8', textAlign: 'right' }}>
            Doc No: {rfq.requestWorkNo} &nbsp;|&nbsp; Page 1 of 1 &nbsp;|&nbsp; Confidential
          </div>
        </div>

      </div>
    </div>
  )
}
