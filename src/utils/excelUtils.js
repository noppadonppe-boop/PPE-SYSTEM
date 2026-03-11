import * as XLSX from 'xlsx'

// ─── Generic helpers ──────────────────────────────────────────────────────────

function autoFitCols(ws, data) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  ws['!cols'] = keys.map(k => ({
    wch: Math.max(k.length, ...data.map(row => String(row[k] ?? '').length)) + 2,
  }))
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

// ─── Unit Rates ───────────────────────────────────────────────────────────────

const UR_HEADERS = ['category', 'task', 'unit', 'min', 'max', 'avg']
const UR_DISPLAY = ['Category', 'Task Name', 'Unit', 'Min (Easy) MH', 'Max (Hard) MH', 'Avg (Normal) MH']

export function exportUnitRates(unitRates) {
  const rows = unitRates.map(r => ({
    Category: r.category,
    'Task Name': r.task,
    Unit: r.unit,
    'Min (Easy) MH': r.min,
    'Max (Hard) MH': r.max,
    'Avg (Normal) MH': r.avg,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoFitCols(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Unit Rates')
  downloadWorkbook(wb, 'UnitRates_Export.xlsx')
}

export function downloadUnitRateTemplate() {
  const sample = [
    {
      Category: 'Mechanical',
      'Task Name': 'Pipe Spool Fabrication',
      Unit: 'inch-dia',
      'Min (Easy) MH': 2.5,
      'Max (Hard) MH': 6.0,
      'Avg (Normal) MH': 4.0,
    },
    {
      Category: 'Civil',
      'Task Name': 'Concrete Pouring',
      Unit: 'm³',
      'Min (Easy) MH': 3.0,
      'Max (Hard) MH': 8.0,
      'Avg (Normal) MH': 5.5,
    },
  ]
  const ws = XLSX.utils.json_to_sheet(sample)
  autoFitCols(ws, sample)

  // Notes sheet
  const notes = XLSX.utils.aoa_to_sheet([
    ['Column', 'Required', 'Description'],
    ['Category', 'Yes', 'Mechanical / Civil / Electrical / Instrumentation / Insulation / Piping / Structural / Others'],
    ['Task Name', 'Yes', 'Name of the task'],
    ['Unit', 'Yes', 'Unit of measurement (e.g. m², unit, inch-dia, m, ton, loop)'],
    ['Min (Easy) MH', 'Yes', 'Manhours for easy difficulty (number ≥ 0)'],
    ['Max (Hard) MH', 'Yes', 'Manhours for hard difficulty (number ≥ min)'],
    ['Avg (Normal) MH', 'Yes', 'Manhours for normal difficulty (number ≥ 0)'],
  ])
  notes['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions')
  downloadWorkbook(wb, 'UnitRates_Template.xlsx')
}

export function parseUnitRatesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

        const valid = []
        const errors = []

        rows.forEach((row, i) => {
          const lineNo = i + 2
          const category = String(row['Category'] ?? row['category'] ?? '').trim()
          const task     = String(row['Task Name'] ?? row['task'] ?? '').trim()
          const unit     = String(row['Unit'] ?? row['unit'] ?? '').trim()
          const min      = parseFloat(row['Min (Easy) MH'] ?? row['min'] ?? '')
          const max      = parseFloat(row['Max (Hard) MH'] ?? row['max'] ?? '')
          const avg      = parseFloat(row['Avg (Normal) MH'] ?? row['avg'] ?? '')

          const rowErrors = []
          if (!category) rowErrors.push('Category missing')
          if (!task)     rowErrors.push('Task Name missing')
          if (!unit)     rowErrors.push('Unit missing')
          if (isNaN(min) || min < 0) rowErrors.push('Min invalid')
          if (isNaN(max) || max < 0) rowErrors.push('Max invalid')
          if (isNaN(avg) || avg < 0) rowErrors.push('Avg invalid')
          if (!isNaN(min) && !isNaN(max) && min > max) rowErrors.push('Min > Max')

          if (rowErrors.length) {
            errors.push({ row: lineNo, issues: rowErrors })
          } else {
            valid.push({ category, task, unit, min, max, avg })
          }
        })

        resolve({ valid, errors, total: rows.length })
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Team Rates ───────────────────────────────────────────────────────────────

export function exportTeamRates(teamRates) {
  const rows = teamRates.map(r => ({
    Name: r.name,
    Position: r.position,
    'Rate Per Hour (THB)': r.ratePerHour,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoFitCols(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Team Rates')
  downloadWorkbook(wb, 'TeamRates_Export.xlsx')
}

export function downloadTeamRateTemplate() {
  const sample = [
    { Name: 'Ahmad Fauzi',   Position: 'Senior Engineer', 'Rate Per Hour (THB)': 85000 },
    { Name: 'Budi Santoso',  Position: 'Engineer',        'Rate Per Hour (THB)': 65000 },
    { Name: 'Citra Dewi',    Position: 'Junior Engineer', 'Rate Per Hour (THB)': 45000 },
  ]
  const ws = XLSX.utils.json_to_sheet(sample)
  autoFitCols(ws, sample)

  const notes = XLSX.utils.aoa_to_sheet([
    ['Column', 'Required', 'Description'],
    ['Name', 'Yes', 'Full name of the engineer / team member'],
    ['Position', 'Yes', 'Lead Engineer / Senior Engineer / Engineer / Junior Engineer / Senior Technician / Technician / Drafter / Admin'],
    ['Rate Per Hour (THB)', 'Yes', 'Hourly rate in THB (positive integer)'],
  ])
  notes['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 70 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions')
  downloadWorkbook(wb, 'TeamRates_Template.xlsx')
}

export function parseTeamRatesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

        const valid = []
        const errors = []

        rows.forEach((row, i) => {
          const lineNo = i + 2
          const name        = String(row['Name'] ?? row['name'] ?? '').trim()
          const position    = String(row['Position'] ?? row['position'] ?? '').trim()
          const ratePerHour = parseInt(row['Rate Per Hour (THB)'] ?? row['ratePerHour'] ?? '', 10)

          const rowErrors = []
          if (!name)             rowErrors.push('Name missing')
          if (!position)         rowErrors.push('Position missing')
          if (isNaN(ratePerHour) || ratePerHour <= 0) rowErrors.push('Rate invalid (must be > 0)')

          if (rowErrors.length) {
            errors.push({ row: lineNo, issues: rowErrors })
          } else {
            valid.push({ name, position, ratePerHour })
          }
        })

        resolve({ valid, errors, total: rows.length })
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}
